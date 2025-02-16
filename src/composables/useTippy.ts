import tippy, { Instance, Props, Content } from 'tippy.js'
import {
  ref,
  onMounted,
  Ref,
  isRef,
  isReactive,
  isVNode,
  render,
  watch,
  VNode,
  h,
  onUnmounted,
  getCurrentInstance,
} from 'vue'
import { TippyOptions, TippyContent } from '../types'

tippy.setDefaultProps({
  //@ts-ignore
  onShow: instance => {
    if (!instance.props.content) return false
  },
})

export function useTippy(
  el: Element | (() => Element) | Ref<Element> | Ref<Element | undefined>,
  opts: TippyOptions = {},
  settings: {
    mount: boolean
  } = { mount: true }
) {
  const vm = getCurrentInstance()
  const instance = ref<Instance>()
  const state = ref({
    isEnabled: false,
    isVisible: false,
    isDestroyed: false,
    isMounted: false,
    isShown: false,
  })

  let container: any = null

  const getContainer = () => {
    if (container) return container
    container = document.createDocumentFragment()
    return container
  }

  const getContent = (content: TippyContent): Content => {
    let newContent: Content

    //@ts-ignore
    let unwrappedContent: Content | VNode | { render: Function } = isRef<Content | VNode | { render: Function }>(
      content
    )
      ? content.value as Content | VNode | { render: Function }
      : content as Content | VNode | { render: Function }

    if (isVNode(unwrappedContent)) {
      if (vm) {
        unwrappedContent.appContext = vm.appContext
      }

      render(unwrappedContent, getContainer())
      newContent = () => getContainer()
    } else if (typeof unwrappedContent === 'object') {
      let comp = h(unwrappedContent)

      if (vm) {
        comp.appContext = vm.appContext
      }

      render(comp, getContainer())

      newContent = () => getContainer()
    } else {
      newContent = unwrappedContent
    }

    return newContent
  }

  const getProps = (opts: TippyOptions): Partial<Props> => {
    let options: any = {}

    if (isRef(opts)) {
      options = opts.value || {}
    } else if (isReactive(opts)) {
      options = { ...opts }
    } else {
      options = { ...opts }
    }

    if (options.content) {
      options.content = getContent(options.content)
    }

    if (options.triggerTarget) {
      options.triggerTarget = isRef(options.triggerTarget)
        ? options.triggerTarget.value
        : options.triggerTarget
    }

    if (!options.plugins || !Array.isArray(options.plugins)) {
      options.plugins = []
    }

    options.plugins = options.plugins.filter((plugin: any) => plugin.name !== 'vueTippyReactiveState');

    options.plugins.push({
      name: 'vueTippyReactiveState',
      fn: () => {
        return {
          onCreate() {
            state.value.isEnabled = true
          },
          onMount() {
            state.value.isMounted = true
          },
          onShow() {
            state.value.isMounted = true
            state.value.isVisible = true
          },
          onShown() {
            state.value.isShown = true
          },
          onHide() {
            state.value.isMounted = false
            state.value.isVisible = false
          },
          onHidden() {
            state.value.isShown = false
          },
          onUnmounted() {
            state.value.isMounted = false
          },
          onDestroy() {
            state.value.isDestroyed = true
          },
        }
      }
    })

    return options as Props
  }

  const refresh = () => {
    if (!instance.value) return

    instance.value.setProps(getProps(opts))
  }

  const refreshContent = () => {
    if (!instance.value || !opts.content) return

    instance.value.setContent(getContent(opts.content))
  }

  const setContent = (value: TippyContent) => {
    instance.value?.setContent(getContent(value))
  }

  const setProps = (value: TippyOptions) => {
    instance.value?.setProps(getProps(value))
  }

  const destroy = () => {
    if (instance.value) {
      try {
        //@ts-ignore
        // delete instance.value.reference.$tippy
      } catch (error) { }

      instance.value.destroy()
      instance.value = undefined
    }
    container = null
  }

  const show = () => {
    instance.value?.show()
  }

  const hide = () => {
    instance.value?.hide()
  }

  const disable = () => {
    instance.value?.disable()
    state.value.isEnabled = false;
  }

  const enable = () => {
    instance.value?.enable()
    state.value.isEnabled = true;
  }

  const unmount = () => {
    instance.value?.unmount()
  }

  const mount = () => {
    if (!el) return

    let target = isRef(el) ? el.value : el

    if (typeof target === 'function') target = target()

    if (target) {
      instance.value = tippy(target, getProps(opts))
      //@ts-ignore
      target.$tippy = response
    }
  }

  const response = {
    tippy: instance,
    refresh,
    refreshContent,
    setContent,
    setProps,
    destroy,
    hide,
    show,
    disable,
    enable,
    unmount,
    mount,
    state,
  }

  if (settings.mount) {
    if (vm) {
      if (vm.isMounted) {
        mount()
      } else {
        onMounted(mount)
      }

      onUnmounted(() => {
        destroy()
      })
    } else {
      mount()
    }
  }

  if (isRef(opts) || isReactive(opts)) {
    watch(opts, refresh, { immediate: false })
  } else if (isRef(opts.content)) {
    watch(opts.content, refreshContent, { immediate: false })
  }

  return response
}
