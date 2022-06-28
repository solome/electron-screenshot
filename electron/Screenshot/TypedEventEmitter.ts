const EVENT_SYMBOL: unique symbol = Symbol("__$$TypedEventEmitter$$__")

export type TypedEventMap = {
  [name: string]: (...args: any[]) => void | boolean
}

function __generateEventIfNotExisted<T extends TypedEventMap>(instance: any): {
  [Key in keyof T]: [callback: (...args: Parameters<T[Key]>) => ReturnType<T[Key]>, once: boolean][]
} {
  if (!instance[EVENT_SYMBOL]) {
    instance[EVENT_SYMBOL] = {}
  }
  return instance[EVENT_SYMBOL]
}

function __removeEventIfNotExisted(instance: any) {
  if (!instance[EVENT_SYMBOL]) {
    delete instance[EVENT_SYMBOL]
  }
}

/**
 * Node.js 中的[EventEmitter](https://nodejs.org/dist/latest-v16.x/docs/api/events.html#class-eventemitter) 并不支持 TypeScript 中的 **[泛型](https://www.typescriptlang.org/docs/handbook/2/generics.html)**，在执行 `**.on('xxx')` 时**不是类型安全**、**编码阶段无事件名校验**。
 *
 * ```
 * interface EventEmitter extends NodeJS.EventEmitter {}
 *
 * type TypedEventMap = {
 *   [name: string]: (...args: any[]) => void | boolean
 * }
 *
 * class TypedEventEmitter<T extends TypedEventMap>{}
 * ```
 *
 */
export default class TypedEventEmitter<T extends TypedEventMap>{

  /**
   * 检测某个事件是否有被注册监听事件。
   * @param name 事件名。
   * @returns boolean。
   */
  hasListener(name: keyof T): boolean {
    const events = __generateEventIfNotExisted<T>(this)
    return events && events[name] && events[name].length > 0
  }

  /**
   * 添加监听事件。
   * @param name 事件名。
   * @param callback 事件回调函数。
   * @param once 是否时间被触发一次后自动销毁该事件监听。
   * @returns
   */
  on<K extends keyof T>(
    name: K,
    callback: (...args: Parameters<T[K]>) => ReturnType<T[K]>,
    once?: boolean
  ): () => void {
    const events = __generateEventIfNotExisted<T>(this)
    if (!events[name]) events[name] = []
    events[name].push([callback as any, once || false])
    return () => this.off(name, callback)
  }


  /**
   * 等同于 `on(name, callback, true)`。
   */
  once<K extends keyof T>(
    name: K,
    callback: (...args: Parameters<T[K]>) => ReturnType<T[K]>,
  ): () => void {
    return this.on(name, callback, true)
  }

  /**
   * 注销某个事件的回调监听。
   * @param name 事件名。
   * @param callback 回调函数。
   * @returns
   */
  off<K extends keyof T>(
    name?: K,
    callback?: (...args: Parameters<T[K]>) => ReturnType<T[K]>
  ): void {
    if (name === undefined) {
      __removeEventIfNotExisted(this)
      return
    }
    const events = __generateEventIfNotExisted<T>(this)
    if (!events[name]) events[name] = []
    if (callback === undefined) {
      events[name].length = 0
      return
    }
    let index = 0
    for (; index < events[name].length; index++) {
      if (events[name][index][0] === callback) break
    }
    if (index < events[name].length) {
      events[name].splice(index, 1)
    }
  }

  /**
   * 触发监听事件。
   * @param name 事件名。
   * @param ...data 该事件相关数据。
   * @returns
   */
  emit<K extends keyof T>(name: K, ...data: Parameters<T[K]>): boolean {
    let canceled = false
    const events = __generateEventIfNotExisted<T>(this)
    const event = events[name] || []
    for (let one of event.slice()) {
      const [callback, once = false] = one
      const result = callback(...data)
      if (once) this.off(name, callback)
      if (result === false) canceled = true
    }
    return canceled
  }
}
