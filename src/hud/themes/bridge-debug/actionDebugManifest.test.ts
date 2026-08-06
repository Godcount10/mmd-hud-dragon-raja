import { ALL_NATIVE_ACTIONS } from '../../../contracts'
import { REGISTERED_NATIVE_ACTIONS } from '../../../bridge/actions/actionRegistry'
import { CONTRACT_ONLY_ACTIONS } from './actionDebugManifest'

describe('bridge-debug action manifest', () => {
  it('matches the native handler registry', () => {
    const registered = new Set(REGISTERED_NATIVE_ACTIONS)
    const expectedContractOnly = ALL_NATIVE_ACTIONS.filter((action) => !registered.has(action))

    expect([...CONTRACT_ONLY_ACTIONS].sort()).toEqual(expectedContractOnly.sort())
  })
})
