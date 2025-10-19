# ---
# Adapted from Modal official example "13_sandboxes/simple_code_interpreter.py"
# cmd: ["python", "13_sandboxes/simple_code_interpreter.py"]
# pytest: false
# ---

# # Build a stateful, sandboxed code interpreter

# This example demonstrates how to build a stateful code interpreter using a Modal
# [Sandbox](https://modal.com/docs/guide/sandbox).

# We'll create a Modal Sandbox that listens for code to execute and then
# executes the code in a Python interpreter. Because we're running in a sandboxed
# environment, we can safely use the "unsafe" `exec()` to execute the code.

# ## Setting up a code interpreter in a Modal Sandbox

# Our code interpreter uses a Python "driver program" to listen for code
# sent in JSON format to its standard input (`stdin`), execute the code,
# and then return the results in JSON format on standard output (`stdout`).

import inspect
import json
from typing import Any

import modal
import modal.container_process


app = modal.App("claude-agent-sdk-starter")

def driver_program():
    """
    Driver program to listen for code sent in JSON format to stdin, execute the code, and return the results in JSON format on stdout.
    """
    import json
    import sys
    from contextlib import redirect_stderr, redirect_stdout
    from io import StringIO

    # When you `exec` code in Python, you can pass in a dictionary
    # that defines the global variables the code has access to.

    # We'll use that to store state.

    globals: dict[str, Any] = {}
    while True:
        command = json.loads(input())  # read a line of JSON from stdin
        if (code := command.get("code")) is None:
            print(json.dumps({"error": "No code to execute"}))
            continue

        # Capture the executed code's outputs
        stdout_io, stderr_io = StringIO(), StringIO()
        with redirect_stdout(stdout_io), redirect_stderr(stderr_io):
            try:
                exec(code, globals)
            except Exception as e:
                print(f"Execution Error: {e}", file=sys.stderr)

        print(
            json.dumps(
                {
                    "stdout": stdout_io.getvalue(),
                    "stderr": stderr_io.getvalue(),
                }
            ),
            flush=True,
        )


# Now that we have the driver program, we can write a function to take a
# `ContainerProcess` that is running the driver program and execute code in it.


def run_code(p: modal.container_process.ContainerProcess, code: str):
    """
    Run code in a ContainerProcess and return the results in JSON format.
    Args:
        p: ContainerProcess
        code: Code to run
    Returns:
        dict: Results in JSON format
    """
    p.stdin.write(json.dumps({"code": code}))
    p.stdin.write("\n")
    p.stdin.drain()
    next_line = next(iter(p.stdout))
    result = json.loads(next_line)
    print(result["stdout"], end="")
    print("\033[91m" + result["stderr"] + "\033[0m", end="")


# We've got our driver program and our code runner. Now we can create a Sandbox
# and run the driver program in it.

# We have to convert the driver program to a string to pass it to the Sandbox.
# Here we use `inspect.getsource` to get the source code as a string,
# but you could also keep the driver program in a separate file and read it in.

driver_program_text = inspect.getsource(driver_program)
driver_program_command = f"""{driver_program_text}\n\ndriver_program()"""

@app.local_entrypoint()
def main():
    """
    Main function to create a Sandbox and run the driver program.
    """
    secret = modal.Secret.from_name("anthropic-secret", required_keys=["ANTHROPIC_API_KEY"])

    image = (
        modal.Image.debian_slim(python_version="3.11")
        .apt_install("curl")
        .run_commands(
            "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
            "apt-get install -y nodejs",
            "npm install -g @anthropic-ai/claude-code", # Needed for Agent SDK
        )
        .pip_install("claude-agent-sdk", "openai")
    )

    sb = modal.Sandbox.create(app=app, image=image, secrets=[secret])
    p = sb.exec("python", "-c", driver_program_command, bufsize=1)

    # ## Running code in a Modal Sandbox
    # Now we can execute some code in the Sandbox!
    # run_code(p, "print('hello, world!')")  # hello, world!

    # The Sandbox and our code interpreter are stateful,
    # so we can define variables and use them in subsequent code.

    # Run Agent SDK code  # The result is: 15
    print("Running Agent SDK code")
    run_code(p, """
import asyncio

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    TextBlock,
    query,
)

async def with_options_example():
    print("=== With Options Example ===")

    options = ClaudeAgentOptions(
        system_prompt="You are a helpful assistant that explains things simply.",
        max_turns=1,
    )

    async for message in query(
        prompt="Explain what Python is in one sentence.", options=options
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Claude: {block.text}")
    print()


asyncio.run(with_options_example())
""")

    # Finally, let's clean up after ourselves and terminate the Sandbox.
    sb.terminate()

if __name__ == "__main__":
    main()