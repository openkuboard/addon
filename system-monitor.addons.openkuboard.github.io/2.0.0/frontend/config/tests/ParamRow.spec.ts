// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ParamRow from '../src/components/ParamRow.vue'
import type { ParamOption } from '../src/utils/params'

const OPTIONS: ParamOption[] = [
  { value: 'local-path', label: 'local-path' },
  { value: '', label: '（留空 / 使用默认）' },
]

function hostDerivedDef(): AddonParamDef {
  return { name: 'KUBERNETES_CLUSTER', category: 'host-derived', default: 'default', description: '集群标识' }
}

function editableDef(): AddonParamDef {
  return { name: 'NODE_EXPORTER_PORT', category: 'user-editable', required: true, default: '9100' }
}

function enumDef(): AddonParamDef {
  return {
    name: 'MONITOR_IMAGE_REGISTRY',
    category: 'enum-from-hostReads',
    hostRead: 'base_image_registry',
    required: false,
    default: '',
  }
}

describe('ParamRow', () => {
  it('host-derived 渲染只读展示，不可编辑、不派发 update:value', () => {
    const wrapper = mount(ParamRow, { props: { def: hostDerivedDef(), value: 'prod221' } })
    expect(wrapper.find('[data-kind="readonly"]').text()).toContain('prod221')
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.emitted('update:value')).toBeUndefined()
    expect(wrapper.text()).toContain('只读')
  })

  it('user-editable 渲染输入框，初始值来自 value，输入后派发 update:value', async () => {
    const wrapper = mount(ParamRow, { props: { def: editableDef(), value: '9100' } })
    // ElInput 把透传 attrs 落到内部原生 input 上
    const input = wrapper.find('[data-kind="text"]')
    expect(input.exists()).toBe(true)
    expect(input.element.tagName.toLowerCase()).toBe('input')
    expect((input.element as HTMLInputElement).value).toBe('9100')
    await input.setValue('9101')
    expect(wrapper.emitted('update:value')?.[0]).toEqual(['9101'])
  })

  it('enum-from-hostReads 渲染下拉容器，并把 options 逐个铺成 option', () => {
    const stubs = {
      ElSelect: {
        template: '<div class="select-stub" data-kind="select"><slot /></div>',
      },
      ElOption: { template: '<div class="option-stub" />' },
    }
    const wrapper = mount(ParamRow, {
      props: { def: enumDef(), value: '', options: OPTIONS },
      global: { stubs },
    })
    expect(wrapper.find('[data-kind="select"]').exists()).toBe(true)
    expect(wrapper.findAll('.option-stub')).toHaveLength(OPTIONS.length)
    expect(wrapper.find('[data-kind="text"]').exists()).toBe(false)
  })

  it('展示分类标签（必填/下拉/只读）与中文描述', () => {
    const wrapper = mount(ParamRow, {
      props: { def: { ...editableDef(), description: 'Node Exporter 端口（hostPort）。' }, value: '9100' },
    })
    expect(wrapper.text()).toContain('必填')
    expect(wrapper.text()).toContain('Node Exporter 端口（hostPort）。')
  })
})
