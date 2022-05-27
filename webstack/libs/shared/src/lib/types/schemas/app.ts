import { AppTypes, AppStates } from '../applications'

export type AppSchema = {
  id: string,
  name: string,
  description: string,
  roomId: string,
  boardId: string,
  ownerId: string,
  type: AppTypes
  state: AppStates
}
