from pathlib import Path
from typing import Optional

import modal

app = modal.App(image=modal.Image.debian_slim().pip_install("anthropic"))


@app.function(secrets=[modal.Secret.from_name("anthropic-secret")])
def analyze_context(context, query):
    import anthropic

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=1024,
        messages=[{"role": "user", "content": query + "\n\n" + context}],
    )
    print(message.content)

    return [block.text for block in message.content]


@app.local_entrypoint()
def main(context: Optional[str] = None, query="Can you summarize what this code does?"):
    if context is None:
        context = Path(__file__).read_text()
    completion = analyze_context.remote(context, query)
    print(query, context, *completion, sep="\n\n")

if __name__ == "__main__":
    main()