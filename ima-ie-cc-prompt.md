# 「いま家？」開発プロンプト（Claude Code用）

## プロジェクト概要
SwitchBotシーリングライトのON/OFF状態だけで、住人の在宅ステータスを自動判定するWebアプリ。
スマートロック連携は将来対応。まずは照明だけの簡易版。

## ディレクトリ
~/naganohiroshi/dev/ima-ie/

## 技術スタック
- Next.js (App Router) + TypeScript + Tailwind CSS
- Upstash Redis（状態 + イベントログ保存）
- Vercel デプロイ
- SwitchBot API v1.1（Webhook + Status API）

## ステータス定義（3種類）
- HOME_AWAKE（在宅/起床）🏠☀️ → 照明ON
- HOME_ASLEEP（在宅/就寝）🏠🌙 → 照明OFF + 夜間
- AWAY（外出）🚶 → 照明OFF + 長時間

## ロジック（照明のみ版）

鍵がないので「時間帯」と「照明OFFの継続時間」で判定する。

### 遷移ルール
1. **照明ON → 在宅/起床**（いつでも。照明がついた＝起きてる）
2. **照明OFF + 夜間（22:00〜翌6:00）→ 30分後に在宅/就寝**
3. **照明OFF + 日中（6:00〜22:00）→ 2時間後に外出**
4. **照明OFF + 在宅/就寝状態で6時間以上経過 → 引き続き就寝**（異常でない）
5. **照明ON + 外出状態だった → 在宅/起床（帰宅扱い）**

### 疑似コード
```
function onLightEvent(powerState):
  now = Date.now()
  hour = new Date(now).getHours()
  state = await redis.get("ima-ie:state")

  if powerState === "ON":
    // 照明ON → 必ず在宅/起床
    previousStatus = state.status
    state.status = "HOME_AWAKE"
    state.pendingTimeout = null
    
    if previousStatus === "AWAY":
      notify("帰宅しました 🏠")
    else if previousStatus === "HOME_ASLEEP":
      notify("起床しました ☀️")
  
  if powerState === "OFF":
    if hour >= 22 || hour < 6:
      // 夜間 → 30分後に就寝判定
      state.pendingTimeout = "SLEEP"
      state.pendingAt = now
    else:
      // 日中 → 2時間後に外出判定
      state.pendingTimeout = "AWAY"  
      state.pendingAt = now

  await redis.set("ima-ie:state", state)

// Cronジョブ（1分間隔）でタイムアウトチェック
function checkTimeouts():
  state = await redis.get("ima-ie:state")
  now = Date.now()
  elapsed = now - state.pendingAt

  if state.pendingTimeout === "SLEEP" && elapsed > 30分:
    state.status = "HOME_ASLEEP"
    notify("就寝しました 🌙")
  
  if state.pendingTimeout === "AWAY" && elapsed > 2時間:
    state.status = "AWAY"
    notify("外出しました 🚶")
```

## 実装する機能

### Phase 1: テストUI + ステートマシン（API不要）
1. メインページ（/）
   - 現在のステータスを大きく表示（アイコン + テキスト + 背景色）
     - HOME_AWAKE: 明るい黄色系
     - HOME_ASLEEP: 暗い紺色系
     - AWAY: グレー系
   - ステータス変更時刻
   - イベントログ（直近20件、新しい順）
   
2. テスト用ボタン（開発中のみ表示）
   - 「💡 照明ON」ボタン → LIGHT_ON イベント発火
   - 「🌑 照明OFF」ボタン → LIGHT_OFF イベント発火
   - 「⏩ 30分経過」ボタン → タイムアウトを強制実行（テスト用）
   - 「⏩ 2時間経過」ボタン → タイムアウトを強制実行（テスト用）
   - 「🔄 リセット」ボタン → 状態を初期化

3. APIエンドポイント
   - POST /api/event → イベント受信（type: "LIGHT_ON" | "LIGHT_OFF"）
   - GET /api/status → 現在のステータス取得
   - POST /api/test/timeout → タイムアウト強制実行（テスト用）
   - POST /api/test/reset → 状態リセット（テスト用）

### Phase 2: SwitchBot API連携
1. POST /api/webhook/switchbot → SwitchBot Webhookの受信エンドポイント
2. GET /api/cron/check-timeout → Vercel Cronで1分間隔実行
3. 環境変数:
   - SWITCHBOT_TOKEN
   - SWITCHBOT_SECRET
   - SWITCHBOT_DEVICE_ID（シーリングライトのID）
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN

### Phase 3: 共有・通知
1. /s/[shareId] → 閲覧専用の共有ページ
2. LINE Notify連携

## Upstash Redis データ構造
```
Key: "ima-ie:state"
Value: {
  "status": "HOME_AWAKE",
  "pendingTimeout": null | "SLEEP" | "AWAY",
  "pendingAt": null | 1234567890000,
  "updatedAt": 1234567890000,
  "lastEvent": {
    "type": "LIGHT_ON",
    "timestamp": 1234567890000
  }
}

Key: "ima-ie:events"
Value: [
  { "type": "LIGHT_ON", "timestamp": 1234567890000, "result": "HOME_AWAKE" },
  { "type": "LIGHT_OFF", "timestamp": 1234567890000, "result": "pending:SLEEP" },
  ...
]（最大100件保持、古いものから削除）
```

## デザイン方針
- シンプル、ミニマル、1ページ完結
- ステータスが画面の中央にドーンと表示
- モバイルファースト
- ダークモード対応

## 注意事項
- APIキーは絶対にフロントエンドに露出させない
- Phase 1はRedisなしでもOK（ローカルのメモリ or JSONファイルで仮実装可）
- Vercelにデプロイすることを前提に作る
- 日本語UI

## まずPhase 1だけ作って。テストボタンで動作確認できる状態にして。
