# 贴贴 bot

由 Rikumi & Alendia 共同研发的超现代化的 Telegram 贴贴机器人。（认真

## 基本功能

贴贴 Bot 最基本的功能是以任意 CJK 字符来对其它群友进行操作。例如，通过 `/贴` 回复其它群友的消息，可以显示你 `贴` 了对方的提示。通过回复贴贴 Bot 发出的消息，会尽可能将动作透传给原发送者。

这个基本功能的灵感来源于 [瓜瓜的聒噪 bot](t.me/fruitymelonbot)，但在实现上做了大量简化。

这个基本功能的实现要求我们能读取并处理群聊中的所有消息，因此 Bot 的隐私模式已被关闭。我们不会获取或者保存群聊中任何无关本 Bot 功能的消息。

## 指令功能

```
add_drink - <name> 添加一种饮料
chatgpt - <question> 调用 ChatGPT 聊天
chatgpt_prompt - <prompt> 修改当前会话的 ChatGPT 前置 Prompt
del - 删除被引用的贴贴 Bot 消息
drink - 随机选择一种饮料
impart - <on|off> 开启/关闭万能指令的 impart 模式
jieba - [sentence] 使用 jieba 进行马尔可夫分词
make - <target> 做个东西
mcinfo - <server>[:port] 查询 Minecraft 服务器信息
me - <description> 代表自己说一句话
pick - 从给出的多个选项中随机选择一个
pick_video - 从本群的视频指令中随机选择一个视频发送
set_video - <command> 将被引用的视频设置为视频指令
tudou - <keyword> 播放土豆猫视频
```
