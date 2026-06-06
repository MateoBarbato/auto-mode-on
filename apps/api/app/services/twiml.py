"""Small TwiML response helpers for WhatsApp replies."""

from html import escape

from app.models.task import ExtractedTask


def confirmation_reply(task: ExtractedTask) -> str:
    date_part = f" - {task.due_date}" if task.due_date else ""
    return twiml_message(f"Registre: {task.task_title}{date_part}. Confirmas?")


def clarification_reply() -> str:
    return twiml_message("No entendi bien. Me podes repetir que hay que hacer y para cuando?")


def unregistered_sender_reply() -> str:
    return twiml_message("No te tengo registrado para esta organizacion. Pedi acceso a coordinacion.")


def twiml_message(body: str) -> str:
    return f"<Response><Message>{escape(body)}</Message></Response>"
