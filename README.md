# 贴贴 bot

由 Rikumi & Alendia 共同研发的超现代化的 Telegram 贴贴机器人。（认真

## 基本功能

贴贴 Bot 最基本的功能是以任意 CJK 字符来对其它群友进行操作。例如，通过 `/贴` 回复其它群友的消息，可以显示你 `贴` 了对方的提示。通过回复贴贴 Bot 发出的消息，会尽可能将动作透传给原发送者。

这个基本功能的灵感来源于 [瓜瓜的聒噪 bot](https://t.me/fruitymelonbot)，但在实现上做了大量简化。

这个基本功能的实现要求我们能读取并处理群聊中的所有消息，因此 Bot 的隐私模式已被关闭。我们不会获取或者保存群聊中任何无关本 Bot 功能的消息。

## 指令功能

```
pick - 从给出的多个选项中随机选择一个
add_drink - 添加一种饮料
drink - 随机选择一种饮料
mcinfo - 查询 Minecraft 服务器信息
chatgpt - 调用 ChatGPT 聊天
chatgpt_token - 设置当前会话的 ChatGPT Session Token，可在 chat.openai.com/chat 页面上获取 Cookie 得到
chatgpt_reset - 重置当前会话的 ChatGPT 上下文
```
