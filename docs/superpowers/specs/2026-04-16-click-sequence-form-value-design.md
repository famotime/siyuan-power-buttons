# 点击序列表单设值设计

## 背景

当前实验点击序列已经支持按步骤查找元素并执行点击，适合“先打开菜单，再点菜单项”这类链式动作。但面对原生表单控件时，现有能力仍不够：

- `select` 现在可以被点击或打开 picker
- 但不能稳定把值切换到指定 `option`
- `input` 和 `textarea` 也没有统一的“按步骤设值”能力

这会导致一类常见自动化场景无法只靠配置完成，例如：

- 打开语言下拉框并切换到 `English`
- 在搜索框中填入固定关键词
- 在文本域里写入预设内容，再执行后续点击

本次目标是在不引入第二套动作模型的前提下，把表单设值纳入现有点击序列步骤。

## 目标

- 现有点击序列步骤支持可选“设值”能力
- `select` 支持按 `option.value` 或显示文本匹配并设值
- `input` 和 `textarea` 支持通过同一套步骤模型写入内容
- 设值成功后统一派发 `input` 和 `change` 事件
- 旧点击序列配置保持兼容，不需要迁移

## 非目标

- 不支持 `checkbox` / `radio` 的勾选状态切换
- 不支持复杂富文本编辑器内容注入
- 不增加独立的“表单赋值动作类型”
- 不把点击序列扩展为任意脚本执行器

## 设计决策

### 1. 复用现有步骤结构，按需补充设值字段

保留当前 `ClickSequenceStep` 的结构和语义，在其上新增两个可选字段：

- `value?: string`
- `valueMode?: "value" | "text"`

规则如下：

- 当 `value` 为空时，本步仍是现有点击步骤
- 当 `value` 为非空字符串时，本步改为设值步骤，不再执行点击
- `valueMode` 默认值为 `"value"`

这样点击和设值可以在同一条序列中混排，不需要为表单场景引入第二套动作类型或迁移旧配置。

### 2. 设值步骤只支持原生表单控件

当步骤带 `value` 时，执行器只接受以下元素：

- `HTMLSelectElement`
- `HTMLInputElement`
- `HTMLTextAreaElement`

如果命中的元素不是这三类之一，则当前步骤失败，并沿用现有点击序列的 `onStepError` 和 `stopOnFailure` 行为。

对 `input` 的支持范围进一步限定为普通文本类输入，不覆盖：

- `type="checkbox"`
- `type="radio"`
- 其他需要单独语义处理的输入类型

这样可以避免把“设值”和“勾选状态切换”混成同一个概念，保持配置行为可预期。

### 3. `select` 同时支持按值和按文本匹配

`select` 的设值需要覆盖两类常见场景：

- 已知稳定的 `option.value`，例如 `en_US`
- 只有界面文本稳定，例如 `English (en_US)`

因此定义两种模式：

- `valueMode: "value"`
  - 通过 `option.value` 精确匹配
- `valueMode: "text"`
  - 通过归一化后的 `option.textContent` 精确匹配

默认使用 `"value"`，因为它通常比文本更稳定，也更适合语言切换、枚举项选择等配置场景。

### 4. `input` / `textarea` 直接写入值，不做额外解析

对 `input` 和 `textarea`：

- `valueMode` 不参与额外语义判断
- 无论 `valueMode` 是 `"value"` 还是 `"text"`，都直接把 `value` 写入控件

这样可以保持步骤模型统一，同时避免为文本框引入没有实际收益的分支逻辑。

### 5. 设值成功后统一派发 `input` 与 `change`

设值步骤成功后，执行器统一派发：

1. `input`
2. `change`

事件均使用 `bubbles: true`。

这样可以兼容常见的原生监听逻辑，也能覆盖大多数依赖表单变更事件的界面行为。

## 运行时行为

每一步的执行流程统一为：

1. 按现有规则等待并查找 `selector`
2. 找到元素后判断本步是否带 `value`
3. `value` 为空时执行现有点击逻辑
4. `value` 非空时执行设值逻辑
5. 成功后等待 `delayAfterMs`

设值逻辑细化如下：

- `select`
  - `valueMode: "value"` 时按 `option.value` 精确匹配
  - `valueMode: "text"` 时按归一化后的 `option.textContent` 精确匹配
  - 匹配成功后写入 `select.value`
  - 若未找到匹配项则步骤失败
- `input` / `textarea`
  - 直接写入 `value`
  - 对不支持的 `input.type` 直接判定失败
- 成功写值后派发 `input` 和 `change`

点击步骤的现有逻辑保持不变，包括：

- `select.showPicker()` 优先
- `click()` 与 `MouseEvent("click")` 回退
- 失败重试、延迟和 `stopOnFailure`

## 设置页与配置兼容

设置页中的点击序列编辑器做最小扩展：

- 保留现有每一步的所有字段
- 在 `selector` 下方新增可选 `设值` 输入框
- 新增 `设值模式` 下拉框
  - `按 value 匹配`
  - `按文本匹配`

交互规则：

- `设值` 为空时，本步视为点击步骤
- `设值` 非空时，本步视为设值步骤
- `设值模式` 仅在 `设值` 非空时生效

配置层兼容规则：

- 旧配置完全兼容
- `value` 不是字符串时丢弃
- `valueMode` 仅接受 `"value"` 或 `"text"`
- 未提供 `valueMode` 时默认补为 `"value"`
- 导入导出时新字段原样保留

## 数据流

1. 设置页中用户为点击序列步骤填写 `selector`
2. 可选填写 `value` 与 `valueMode`
3. 配置保存后进入现有 `sanitize` 流程
4. 运行时执行序列时，按步骤解析为“点击”或“设值”
5. 成功后继续进入下一步

典型配置示例：

```json
{
  "actionType": "experimental-click-sequence",
  "actionId": "lang",
  "experimentalClickSequence": {
    "stopOnFailure": true,
    "steps": [
      {
        "selector": "lang",
        "timeoutMs": 1000,
        "retryCount": 0,
        "retryDelayMs": 0,
        "delayAfterMs": 100
      },
      {
        "selector": "lang",
        "value": "en_US",
        "valueMode": "value",
        "timeoutMs": 1000,
        "retryCount": 0,
        "retryDelayMs": 0,
        "delayAfterMs": 0
      }
    ]
  }
}
```

## 错误处理

以下情况视为步骤失败：

- `selector` 未命中元素
- 带 `value` 的步骤命中了非 `select` / `input` / `textarea`
- `select` 没找到对应选项
- `input.type` 属于当前未支持的类型
- 写值或派发事件过程中抛出异常

失败后的处理沿用当前点击序列语义：

- 调用 `onStepError`
- `stopOnFailure: true` 时立即中断
- `stopOnFailure: false` 时记录失败并继续后续步骤

## 测试策略

- `tests/click-sequence.test.ts`
  - `select` 按 `value` 设值成功，并派发 `input` / `change`
  - `select` 按文本设值成功
  - `input` 设值成功
  - `textarea` 设值成功
  - `select` 找不到目标选项时失败
  - 普通元素配置 `value` 时失败
  - 旧的纯点击步骤保持原行为
- `tests/config-item-defaults.test.ts`
  - 新字段默认值补齐逻辑
- `tests/config-store.test.ts`
  - 新字段 sanitize 与持久化兼容
- `tests/import-export.test.ts`
  - 新字段导入导出不丢失
- `tests/settings-app-layout.test.ts`
  - 设置页可编辑 `设值` 与 `设值模式`

## 风险与约束

- 该能力仍属于实验点击序列的一部分，依赖运行时 DOM 与原生控件行为
- `select` 的文本匹配受界面文案影响，稳定性低于 `option.value`
- 某些宿主界面对 `input` / `change` 的监听顺序较敏感，本次先采用最通用的事件顺序
- 为控制范围，首版不处理 `checkbox` / `radio` / 富文本编辑器
