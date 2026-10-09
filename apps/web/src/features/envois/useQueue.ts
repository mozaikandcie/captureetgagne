import { useSyncExternalStore } from 'react'
import { getSnapshot, subscribe } from './queue'

export const useQueue = () => useSyncExternalStore(subscribe, getSnapshot)
