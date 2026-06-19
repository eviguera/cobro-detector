export interface EmailPayload {
  to: string
  subject: string
  html: string
}

export interface EmailSender {
  send(payload: EmailPayload): Promise<boolean>
}
