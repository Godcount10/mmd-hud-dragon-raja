import { REGISTERED_NATIVE_ACTIONS } from '../../src/bridge/actions/actionRegistry'
import { ALL_NATIVE_ACTIONS, type NativeAction } from '../../src/contracts'

const CONTRACT_ONLY_ACTIONS = new Set<NativeAction>([
  'stopGeneration',
  'continueGeneration',
  'editMessage',
  'previousBranch',
  'nextBranch',
  'newChat',
])

describe('native action registry', () => {
  it('implements every action except the explicit contract-only set', () => {
    const registered = new Set(REGISTERED_NATIVE_ACTIONS)
    const expected = ALL_NATIVE_ACTIONS.filter((action) => !CONTRACT_ONLY_ACTIONS.has(action))

    expect([...registered].sort()).toEqual(expected.sort())
  })
})
