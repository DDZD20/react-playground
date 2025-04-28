# 前端 WebRTC 音视频通信集成指南（配合 Socket.IO 信令）

本项目后端已支持 WebRTC 音视频信令的 Socket 广播，前端可直接对接实现一对一音视频通话。本文档总结了前端开发所需的关键点和代码示例。

---

## 1. 信令事件约定

- `videoOffer`：发送/接收 offer
- `videoAnswer`：发送/接收 answer
- `iceCandidate`：发送/接收 ICE candidate

所有信令事件均通过 Socket.IO 的 interview 命名空间（`/interview`）进行，且只会在房间内广播。

---

## 2. 连接 socket 并加入房间

```js
const socket = io('/interview', {
  auth: { token: '你的JWT' }
});

// 加入房间（需先调用后端接口创建房间，获取 roomId）
socket.emit('joinRoom', { roomId, userId });
```

---

## 3. WebRTC 初始化流程

```js
// 1. 获取本地音视频流
const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

// 2. 创建 PeerConnection，配置 ICE
const pc = new RTCPeerConnection({ iceServers: [
  { urls: 'stun:stun.xten.com:3478' },
  { urls: 'stun:stun.qq.com:3478' },
  { urls: 'stun:stun.uc.cn:3478' }
] });

// 3. 添加本地流
localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
```

---

## 4. 信令交换流程

### A 端发起通话

```js
// 生成 offer 并发送
toOffer = async () => {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('videoOffer', { roomId, offer });
};
```

### B 端收到 offer

```js
socket.on('videoOffer', async ({ from, offer }) => {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('videoAnswer', { roomId, answer });
});
```

### A 端收到 answer

```js
socket.on('videoAnswer', async ({ from, answer }) => {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
});
```

### 双方交换 ICE candidate

```js
// 发送 candidate
pc.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('iceCandidate', { roomId, candidate: event.candidate });
  }
};

// 接收 candidate
socket.on('iceCandidate', ({ from, candidate }) => {
  pc.addIceCandidate(new RTCIceCandidate(candidate));
});
```

---

## 5. 远端流渲染

```js
pc.ontrack = (event) => {
  // 只取第一个流（点对点）
  remoteVideo.srcObject = event.streams[0];
};
```

---

## 6. 其他建议

- ICE 配置建议由后端接口下发，便于后续动态调整。
- 建议在房间成员都 ready 后再发起 WebRTC 协商。
- 支持挂断、重连、静音等功能可按需扩展。

---

## 7. 时序图（简化）

1. A、B 加入同一房间
2. A 发起 offer → Socket 广播 → B 收到
3. B 回复 answer → Socket 广播 → A 收到
4. 双方互传 candidate → Socket 广播 → 对方收到
5. 建立音视频通话

---

如遇到信令收发异常、ICE 服务器不可用等问题，请联系后端同学协助排查。

---

如需多端会议、屏幕共享等高级功能，可与后端同学进一步沟通扩展方案。
