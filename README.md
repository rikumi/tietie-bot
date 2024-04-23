# 贴贴 bot

由 Rikumi & Alendia 共同研发的超现代化的 Telegram 贴贴机器人。（认真

## 基本功能

贴贴 Bot 最基本的功能是以任意 CJK 字符来对其它群友进行操作。例如，通过 `/贴` 回复其它群友的消息，可以显示你 `贴` 了对方的提示。通过回复贴贴 Bot 发出的消息，会尽可能将动作透传给原发送者。

这个基本功能的灵感来源于 [瓜瓜的聒噪 bot](https://t.me/fruitymelonbot)，但在实现上做了大量简化。

这个基本功能的实现要求我们能读取并处理群聊中的所有消息，因此 Bot 的隐私模式已被关闭。我们不会获取或者保存群聊中任何无关本 Bot 功能的消息。

## 指令功能

```
add_drink - <name> 添加一种饮料
alias - <name> [target] 设置指令的别名
chou - 模拟十连抽卡
del - 删除被引用的贴贴 Bot 消息
discord - <guildId> <channelId> | rejoin 链接到 Discord 频道（管理员使用）
drink - 随机选择一种饮料
jieba - [sentence] 使用 jieba 进行马尔可夫分词
make - <target> 做个东西
mcinfo - <server>[:port] 查询 Minecraft 服务器信息
me - <description> 代表自己说一句话
nick - [name] 设置自己转发到 Discord 频道的昵称
pick - 从给出的多个选项中随机选择一个
pick_video - 从本群的视频指令中随机选择一个视频发送
repeat - <on|off> 开启/关闭感叹句复读功能
search - 群内隐私搜索
set_video - <command> 将被引用的视频设置为视频指令
tietie - <on|off> 开启/关闭任意非 ASCII 指令贴贴功能
tudou - <keyword> 播放土豆猫视频
update - 更新代码并重启（管理员使用）
```
