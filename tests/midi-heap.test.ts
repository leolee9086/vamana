import { describe, it, expect } from 'vitest'
import { MidiHeapGeneric } from '../src/midi-heap.js'

describe('MidiHeapGeneric', () => {
  interface TestItem {
    id: number
    value: number
  }

  describe('基本操作', () => {
    it('应该正确创建固定容量堆', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const heap = new MidiHeapGeneric<TestItem>(5, compare)
      
      expect(heap.length).toBe(0)
      expect(heap.isFull()).toBe(false)
      expect(heap.peek()).toBeUndefined()
    })

    it('应该正确插入元素直到满', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const heap = new MidiHeapGeneric<TestItem>(3, compare)
      
      heap.push({ id: 1, value: 3 })
      expect(heap.length).toBe(1)
      expect(heap.isFull()).toBe(false)
      
      heap.push({ id: 2, value: 1 })
      expect(heap.length).toBe(2)
      expect(heap.isFull()).toBe(false)
      
      heap.push({ id: 3, value: 4 })
      expect(heap.length).toBe(3)
      expect(heap.isFull()).toBe(true)
      
      // 堆满后插入应该被忽略
      heap.push({ id: 4, value: 2 })
      expect(heap.length).toBe(3)
      expect(heap.isFull()).toBe(true)
    })

    it('应该正确弹出元素', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const heap = new MidiHeapGeneric<TestItem>(5, compare)
      
      heap.push({ id: 1, value: 3 })
      heap.push({ id: 2, value: 1 })
      heap.push({ id: 3, value: 4 })
      
      expect(heap.pop()).toEqual({ id: 2, value: 1 })
      expect(heap.pop()).toEqual({ id: 1, value: 3 })
      expect(heap.pop()).toEqual({ id: 3, value: 4 })
      expect(heap.pop()).toBeUndefined()
    })

    it('应该正确替换堆顶元素', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const heap = new MidiHeapGeneric<TestItem>(3, compare)
      
      heap.push({ id: 1, value: 3 })
      heap.push({ id: 2, value: 1 })
      heap.push({ id: 3, value: 4 })
      
      // 替换堆顶元素
      const replaced = heap.replace({ id: 4, value: 2 })
      expect(replaced).toEqual({ id: 2, value: 1 }) // 原来的最小值
      
      // 新的最小值应该是2
      expect(heap.peek()).toEqual({ id: 4, value: 2 })
    })
  })

  describe('初始化数据', () => {
    it('应该正确使用初始数据创建堆', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const initialData: TestItem[] = [
        { id: 1, value: 3 },
        { id: 2, value: 1 },
        { id: 3, value: 4 }
      ]
      
      const heap = new MidiHeapGeneric<TestItem>(5, compare, initialData)
      expect(heap.length).toBe(3)
      expect(heap.peek()).toEqual({ id: 2, value: 1 })
    })

    it('应该正确处理超过容量的初始数据', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const initialData: TestItem[] = [
        { id: 1, value: 3 },
        { id: 2, value: 1 },
        { id: 3, value: 4 },
        { id: 4, value: 2 },
        { id: 5, value: 5 },
        { id: 6, value: 0 }
      ]
      
      const heap = new MidiHeapGeneric<TestItem>(3, compare, initialData)
      expect(heap.length).toBe(3)
      expect(heap.isFull()).toBe(true)
      
      // 只保留前3个元素，然后进行堆化
      // 前3个元素是: [3, 1, 4]，堆化后最小值是1
      expect(heap.pop()).toEqual({ id: 2, value: 1 })
      expect(heap.pop()).toEqual({ id: 1, value: 3 })
      expect(heap.pop()).toEqual({ id: 3, value: 4 })
    })
  })

  describe('数组转换', () => {
    it('应该正确转换为数组', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const heap = new MidiHeapGeneric<TestItem>(5, compare)
      
      heap.push({ id: 1, value: 3 })
      heap.push({ id: 2, value: 1 })
      heap.push({ id: 3, value: 4 })
      
      const array = heap.toArray()
      expect(array).toHaveLength(3)
      expect(array).toContainEqual({ id: 1, value: 3 })
      expect(array).toContainEqual({ id: 2, value: 1 })
      expect(array).toContainEqual({ id: 3, value: 4 })
    })

    it('应该正确转换为排序数组', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const heap = new MidiHeapGeneric<TestItem>(5, compare)
      
      heap.push({ id: 1, value: 3 })
      heap.push({ id: 2, value: 1 })
      heap.push({ id: 3, value: 4 })
      
      const sortedArray = heap.toSortedArray()
      expect(sortedArray).toEqual([
        { id: 2, value: 1 },
        { id: 1, value: 3 },
        { id: 3, value: 4 }
      ])
    })
  })

  describe('清空操作', () => {
    it('应该正确清空堆', () => {
      const compare = (a: TestItem, b: TestItem) => a.value - b.value
      const heap = new MidiHeapGeneric<TestItem>(5, compare)
      
      heap.push({ id: 1, value: 3 })
      heap.push({ id: 2, value: 1 })
      
      expect(heap.length).toBe(2)
      
      heap.clear()
      expect(heap.length).toBe(0)
      expect(heap.isFull()).toBe(false)
      expect(heap.peek()).toBeUndefined()
    })
  })
}) 