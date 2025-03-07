/*
 * Copyright 2023 lspriv. All Rights Reserved.
 * Distributed under MIT license.
 * See File LICENSE for detail or copy at https://opensource.org/licenses/MIT
 * @Description: 工具方法
 * @Author: lspriv
 * @LastEditTime: 2024-06-07 23:21:38
 */

import { PKG_NAME, WEEKS, VIEWS, CALENDAR_PANELS, FULL_LAYOUT, View } from './constants';
import { values } from '../utils/shared';

import type { Voidable } from '../utils/shared';
import type { CalendarWeek, LayoutArea } from '../interface/component';

declare global {
  namespace WechatMiniprogram {
    namespace Component {
      interface AnimatedUpdater {
        (): SkylineStyleObject;
      }
      interface AnimatedUserConfig {
        immediate?: boolean;
        flush?: 'async' | 'sync';
      }
      interface AnimatedResult {
        styleId: number;
      }
      interface InstanceProperties {
        renderer: 'webview' | 'skyline';
        applyAnimatedStyle(
          selector: string,
          updater: AnimatedUpdater,
          userConfig?: AnimatedUserConfig,
          callback?: (result: AnimatedResult) => void
        ): void;
        clearAnimatedStyle(selector: string, styleIds: Array<number>, callback?: () => void): void;
      }
    }
  }
}

export type SkylineStyleObject = Record<string, string | number>;

export interface Shared<T> {
  value: T;
}

export type BoundingClientRects = Array<WechatMiniprogram.BoundingClientRectCallbackResult>;

export type ComponentInstance = WechatMiniprogram.Component.Instance<
  WechatMiniprogram.Component.DataOption,
  WechatMiniprogram.Component.PropertyOption,
  WechatMiniprogram.Component.MethodOption
>;

export type CalendarView = (typeof VIEWS)[keyof typeof VIEWS];

export const viewFlag = (view: string): View => {
  const inputView = view || VIEWS.MONTH;
  const idx = values(VIEWS).indexOf(inputView as CalendarView);
  return idx < 0 ? View.month : 1 << idx;
};

export const isView = (view: unknown): view is View =>
  view === View.week || view === View.month || view === View.schedule;

export const flagView = (flag: View) => values(VIEWS)[Math.log2(flag)];

export const middle = (count: number) => count >> 1;

export const isSkyline = (renderer?: string): renderer is 'skyline' => renderer === 'skyline';

export const circularDiff = (idx: number, curr: number): number => {
  const half = Math.floor(CALENDAR_PANELS / 2);
  if (idx < curr - half) idx = idx + CALENDAR_PANELS;
  if (idx > curr + half) idx = idx - CALENDAR_PANELS;
  return idx - curr;
};

export const InitPanels = <T>(prefix: string, mixin: Record<string, any> = {}) =>
  Array.from<undefined, T>({ length: CALENDAR_PANELS }, (_, i) => ({ key: `${prefix}_${i}`, ...mixin }) as T);

export const InitWeeks = (weeks: string = WEEKS, prefix: string = 'w') =>
  Array.from<undefined, CalendarWeek>({ length: weeks.length }, (_, i) => ({
    key: `${prefix}_${i}`,
    label: weeks[i]
  }));

export const easingOpt = (
  duration: number,
  easing: (...args: any[]) => any = wx.worklet.Easing.out(wx.worklet.Easing.sin)
): WechatMiniprogram.TimingOption => ({ duration, easing });

export const nextTick = <
  T extends Voidable<(...args: any[]) => any> = undefined,
  R = T extends NonNullable<T> ? Awaited<ReturnType<T>> : void
>(
  callback?: T
) => {
  return new Promise<R>(resolve => {
    wx.nextTick(() => {
      resolve(callback?.());
    });
  });
};

export const severalTicks = async (times: number) => {
  while (times--) {
    await nextTick();
  }
};

/**
 * 绑定 worklet动画
 */
export const applyAnimated = (
  instance: ComponentInstance,
  selector: string,
  updater: WechatMiniprogram.Component.AnimatedUpdater,
  options?: WechatMiniprogram.Component.AnimatedUserConfig
) => {
  return new Promise<number>(resolve => {
    instance.applyAnimatedStyle(selector, updater, options, result => {
      resolve(result.styleId);
    });
  });
};

/**
 * 取消 worklet 动画绑定
 */
export const clearAnimated = (instance: ComponentInstance, selector: string, ids: Array<number>) => {
  return new Promise<void>(resolve => {
    instance.clearAnimatedStyle(selector, ids, () => {
      resolve();
    });
  });
};

/**
 * 获取节点信息
 * @param component 组件实例
 */
export const nodeRect = (component: ComponentInstance) => {
  const selectorQuery = component.createSelectorQuery().in(component);
  return (selector: string) =>
    new Promise<BoundingClientRects>((resolve, reject) => {
      selectorQuery
        .selectAll(selector)
        .boundingClientRect(results => {
          const rects = results as unknown as BoundingClientRects;
          if (rects.length) resolve(rects);
          else reject(`view not found by selector ${selector}`);
        })
        .exec();
    });
};

/**
 * 获取页面偏移
 * @param component 组件实例
 */
export const viewportOffset = (component: ComponentInstance) => {
  return new Promise<WechatMiniprogram.ScrollOffsetCallbackResult>(resolve => {
    component.createSelectorQuery().selectViewport().scrollOffset(resolve).exec();
  });
};

/**
 * 合并字符串
 * @param strs 字符串
 * @param separator 分隔符，默认 ','
 */
export const mergeStr = (strs: Array<string>, separator: string = ',') => {
  return strs.flatMap(s => s.split(separator).map(w => w.trim())).join(separator);
};

export interface OnceEmitter {
  emit: (...detail: any[]) => void;
  cancel: () => void;
}
/** 触发一次 */
export const onceEmitter = (instance: ComponentInstance, event: string): OnceEmitter => {
  let emits = 0;
  return {
    emit: function (...detail: any[]) {
      if (emits++) return;
      instance.triggerEvent(event, ...detail);
    },
    cancel: function () {
      emits++;
    }
  };
};

export const layoutHideCls = (layout?: Array<LayoutArea>): string => {
  if (!layout?.length) return '';
  const hideAreas = FULL_LAYOUT.filter(item => !layout.includes(item));
  return hideAreas.map(item => `wc--hide-${item}`).join(' ');
};

export const addLayoutHideCls = (cls: string, area: LayoutArea): string => {
  const reg = new RegExp(`wc--hide-${area}\\s*`);
  if (reg.test(cls)) return cls;
  return `${cls} wc--hide-${area}`;
};

export const hasLayoutArea = (cls: string, area: LayoutArea) => !new RegExp(`wc--hide-${area}\\s*`).test(cls);

export const warn = (...args: any[]) => console.warn(`[${PKG_NAME}]`, ...args);
