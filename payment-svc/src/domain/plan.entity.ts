export interface Plan {
  id: string
  name: string
  credits: number
  priceClp: number
  isSubscription: boolean
  successFee?: number
}

export const PLANS: Record<string, Plan> = {
  inicial: { id: 'inicial', name: 'Inicial', credits: 1, priceClp: 20000, isSubscription: false },
  plus: { id: 'plus', name: 'Plus', credits: 2, priceClp: 30000, isSubscription: false },
  contador: { id: 'contador', name: 'Contador', credits: 10, priceClp: 100000, isSubscription: false },
  platino: { id: 'platino', name: 'Platino', credits: 999, priceClp: 0, isSubscription: true, successFee: 0.2 },
}
