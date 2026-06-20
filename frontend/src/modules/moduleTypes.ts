import type { useEthizoAppController } from '../hooks/useEthizoAppController'

export interface ModuleProps {
  controller: ReturnType<typeof useEthizoAppController>
}
