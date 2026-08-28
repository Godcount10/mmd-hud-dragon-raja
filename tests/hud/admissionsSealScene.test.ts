import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const sceneMocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  mount: vi.fn(),
}))

vi.mock('../../src/hud/themes/dragon-raja/components/admissionsSealScene', () => ({
  mountAdmissionsSealScene: sceneMocks.mount,
  describeAdmissionsSealSceneFailure: (error: unknown) => ({
    code: 'initialization-failed',
    message: error instanceof Error ? error.message : String(error),
  }),
}))

vi.mock('../../src/hud/themes/dragon-raja/components/LightRays.vue', () => ({
  default: {
    name: 'LightRays',
    props: ['raysOrigin', 'raysColor', 'followMouse'],
    template: '<div class="dr-light-rays-stub" />',
  },
}))

import AdmissionsSealScene from '../../src/hud/themes/dragon-raja/components/AdmissionsSealScene.vue'

describe('AdmissionsSealScene', () => {
  it('disposes its WebGL controller when Vue unmounts the welcome surface', async () => {
    sceneMocks.mount.mockReturnValue({ dispose: sceneMocks.dispose })
    const wrapper = mount(AdmissionsSealScene)
    await wrapper.vm.$nextTick()

    expect(sceneMocks.mount).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), expect.any(Object))
    expect(wrapper.attributes('data-webgl-status')).toBe('active')
    expect(wrapper.find('.dr-webgl-welcome__scene--light-rays-embers').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'LightRays' }).props()).toMatchObject({
      raysOrigin: 'top-center',
      raysColor: '#ffd184',
      followMouse: false,
    })

    wrapper.unmount()
    expect(sceneMocks.dispose).toHaveBeenCalledOnce()
  })

  it('keeps the poster fallback mounted when WebGL initialization fails', async () => {
    sceneMocks.mount.mockImplementation(() => { throw new Error('no webgl') })
    const wrapper = mount(AdmissionsSealScene)
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('data-webgl-status')).toBe('fallback')
    expect(wrapper.attributes('data-webgl-failure-code')).toBe('initialization-failed')
    expect(wrapper.attributes('data-webgl-failure-detail')).toBe('no webgl')
    expect(wrapper.find('.dr-webgl-welcome__fallback').exists()).toBe(true)
    expect(wrapper.find('.dr-webgl-welcome__diagnostic').text()).toContain('no webgl')

    wrapper.unmount()
  })
})
