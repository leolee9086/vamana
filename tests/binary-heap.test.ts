import { describe, it, expect } from 'vitest'
import { BinaryHeap, BinaryHeapGeneric } from '../src/binary-heap.js'

describe('BinaryHeap', () => {
  describe('基本操作', () => {
    it('应该正确创建空堆', () => {
      const heap = new BinaryHeap()
      expect(heap.length).toBe(0)
      expect(heap.peek()).toBeUndefined()
    })

    it('应该正确创建带初始数据的堆', () => {
      const heap = new BinaryHeap([3, 1, 4, 1, 5])
      expect(heap.length).toBe(5)
      expect(heap.peek()).toBe(1) // 最小堆，顶部是最小值
    })

    it('应该正确插入元素', () => {
      const heap = new BinaryHeap()
      heap.push(3)
      heap.push(1)
      heap.push(4)
      
      expect(heap.length).toBe(3)
      expect(heap.peek()).toBe(1)
    })

    it('应该正确弹出元素', () => {
      const heap = new BinaryHeap([3, 1, 4, 1, 5])
      
      expect(heap.pop()).toBe(1)
      expect(heap.pop()).toBe(1)
      expect(heap.pop()).toBe(3)
      expect(heap.pop()).toBe(4)
      expect(heap.pop()).toBe(5)
      expect(heap.pop()).toBeUndefined()
    })

    it('应该正确批量插入', () => {
      const heap = new BinaryHeap()
      heap.pushBulk([3, 1, 4, 1, 5])
      
      expect(heap.length).toBe(5)
      expect(heap.pop()).toBe(1)
      expect(heap.pop()).toBe(1)
      expect(heap.pop()).toBe(3)
      expect(heap.pop()).toBe(4)
      expect(heap.pop()).toBe(5)
    })
  })

  describe('堆属性验证', () => {
    it('应该维护堆属性', () => {
      const heap = new BinaryHeap([3, 1, 4, 1, 5, 9, 2, 6])
      expect(heap.isValid()).toBe(true)
      
      // 弹出所有元素后应该仍然有效
      while (heap.length > 0) {
        heap.pop()
        expect(heap.isValid()).toBe(true)
      }
    })
  })
})

describe('BinaryHeapGeneric', () => {
  interface TestItem {
    id: number
    value: number
  }

  describe('泛型堆操作', () => {
    it('应该正确创建泛型堆', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const heap = new BinaryHeapGeneric<TestItem>([], compare)
      
      expect(heap.length).toBe(0)
      expect(heap.peek()).toBeUndefined()
    })

    it('应该正确插入和弹出自定义对象', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const heap = new BinaryHeapGeneric<TestItem>([], compare)
      
      heap.push({ id: 1, value: 3 })
      heap.push({ id: 2, value: 1 })
      heap.push({ id: 3, value: 4 })
      
      expect(heap.length).toBe(3)
      expect(heap.peek()).toEqual({ id: 2, value: 1 })
      
      expect(heap.pop()).toEqual({ id: 2, value: 1 })
      expect(heap.pop()).toEqual({ id: 1, value: 3 })
      expect(heap.pop()).toEqual({ id: 3, value: 4 })
    })

    it('应该正确批量插入自定义对象', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const heap = new BinaryHeapGeneric<TestItem>([], compare)
      
      const items: TestItem[] = [
        { id: 1, value: 3 },
        { id: 2, value: 1 },
        { id: 3, value: 4 },
        { id: 4, value: 1 },
        { id: 5, value: 5 }
      ]
      
      heap.pushBulk(items)
      expect(heap.length).toBe(5)
      
      // 应该按值排序弹出
      expect(heap.pop()?.value).toBe(1)
      expect(heap.pop()?.value).toBe(1)
      expect(heap.pop()?.value).toBe(3)
      expect(heap.pop()?.value).toBe(4)
      expect(heap.pop()?.value).toBe(5)
    })
  })
}) 