export interface AnalysisRepository {
  /**
   * Marca el análisis como completado con compare-and-swap: solo aplica si
   * el análisis sigue en 'awaiting_payment' (el estado intermedio del
   * paywall platino). Devuelve true si aplicó la transición, false si el
   * análisis ya cambió de estado (otro webhook lo completó o nunca estuvo
   * pendiente de pago). Así un webhook duplicado no puede pisar el estado.
   */
  markCompleted(analysisId: string): Promise<boolean>
}
