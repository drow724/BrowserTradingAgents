# Reliability sample — maintainer blind re-judgement (Feature 018, T016)

How to judge (Feature 017 rules): for each **number** write a line only if it is NOT correct: `<item id> real-error <why>` or `<item id> debatable <why>`.
For **every interpretation** (marked I) write `<item id> supported|unsupported|none <why>`.
- real-error: wrong value or wrong meaning (e.g. the unrealised change called the recent rise, 9억 5천만 원 for 95,000,000 KRW, the price said to be below the 52-week low when it is above).
- debatable: right value under a loose or garbled label (실현 for unrealised, 평일 for the 20-day average, a stray repeated number).
- supported: restates the facts or news correctly; unsupported: forecasts or judges beyond the facts, restates news with a wrong value, or denies a given fact; none: states no claim.
Write your lines in `evidence/reliability-maintainer.txt` (one per line). Do not look at the judged sheet or the key.

## e408

Facts:
- H1 Holding: Zeta Apple Test Inc. (ZZAP), US listing.
- H2 Quantity held: 12 shares.
- H3 Average purchase price: 201.00 USD.
- D1 Latest price (2026-09-25): 188.40 USD.
- D2 Unrealised change vs. average purchase price: -6.27%.
- D3 Position value at the latest price: 2,260.80 USD.
- M1 The share price fell 6.5% over the last 20 sessions.
- M2 The stock trades at 24.3 times trailing earnings.
- N1 The company announced a 15,000,000,000 USD share buyback on 2026-09-18 (fictional).
- Q1 ZZAP 자사주 매입 규모가 얼마인가요?

Answer: 지점 H1에 따르면 제타 애플 테스트 Inc. (ZZAP)의 자사주 매입 규모에 대한 정보는 제공되지 않습니다. 현재 보유량은 12주이며, 평균 매입 가격은 201.00 USD 입니다. 최신 가격은 188.40 USD 입니다.

Items:
- `e408:0` 12주
- `e408:1` 201.00 USD
- `e408:2` 188.40 USD
- `e408:3` I: (ZZAP)의 자사주 매입 규모에 대한 정보는 제공되지 않습니다.

## e639

Facts:
- H1 Holding: 비트코인 (BTC), Bitcoin.
- H2 Quantity held: 0.25 BTC.
- H3 Average purchase price: 95,000,000 KRW.
- D1 Latest price (2026-09-25): 91,250,000 KRW.
- D2 Unrealised change vs. average purchase price: -3.95%.
- D3 Position value at the latest price: 22,812,500 KRW.
- M1 Bitcoin fell 4.1% over the last 7 days.
- M2 The 30-day high was 98,400,000 KRW on 2026-09-02.
- N1 A large exchange reported a temporary withdrawal halt on 2026-09-23 (fictional).
- Q1 비트코인의 다음 반감기는 언제인가요?

Answer: 비트코인 다음 반감기 날짜에 대한 정보는 제공된 사실에 없습니다. 현재 비트코인의 보유량은 0.25 BTC이며, 평균 매수 가격은 9천 5백만 원입니다. 최근 7일 동안 비트코인은 4.1% 하락했습니다. /

Items:
- `e639:0` 0.25 BTC
- `e639:1` 9천 5백만 원
- `e639:2` 4.1%

## e263

Facts:
- H1 Holding: Zeta S&P 500 Test ETF Trust (ZZSP), US listing.
- H2 Quantity held: 2.5 shares.
- H3 Average purchase price: 480.00 USD.
- D1 Latest price (2026-09-25): 512.30 USD.
- D2 Unrealised change vs. average purchase price: +6.73%.
- D3 Position value at the latest price: 1,280.75 USD.
- M1 The ETF rose 1.8% over the last 20 sessions.
- M2 The ETF is 2.1% below its all-time high of 523.30 USD.
- N1 Index constituents reported mixed third-quarter guidance (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 현재 포트폴리오는 Zeta S&P 500 500 Test ETF Trust (ZZSP) 주식 2.5주를 보유하고 있으며, 평균 매입 가격은 480.00 USD 480.00달러 입니다. 현재 주가는 512.30 USD 512.30달러이며, 이는 평균 매입 가격 대비 6.73% +6.73% 상승한 수치입니다. 최근 20일 동안 해당 ETF는 1.8% 1.8% 상승했으며, 현재 가격은 장기 최고가인 523.30 USD 523.30달러보다 2.1% 2.1% 낮은 수준입니다. /

Items:
- `e263:0` 500
- `e263:1` 500
- `e263:2` 2.5주
- `e263:3` 480.00 USD
- `e263:4` 480.00달러
- `e263:5` 512.30 USD
- `e263:6` 512.30달러
- `e263:7` 6.73%
- `e263:8` 6.73%
- `e263:9` 20
- `e263:10` 1.8%
- `e263:11` 1.8%
- `e263:12` 523.30 USD
- `e263:13` 523.30달러
- `e263:14` 2.1%
- `e263:15` 2.1%
- `e263:16` I: 최근 20일 동안 해당 ETF는 1.8% 1.8% 상승했으며, 현재 가격은 장기 최고가인 523.30 USD 523.30달러보다 2.1% 2.1% 낮은 수준입니다.

## e216

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 테스트바이오(900006) 40주를 15,000원 평균 매수 가격에 보유하고 있으며, 현재 주가는 18,450원입니다. 최근 주가 상승률은 23%이며, 포트폴리오 전체 점검을 위해서는 다른 종목 정보가 추가적으로 필요합니다. 제시된 정보만으로는 전체 포트폴리오의 평가를 내릴 수 없습니다. /

Items:
- `e216:0` 40주
- `e216:1` 15,000원
- `e216:2` 18,450원
- `e216:3` 23%

## e330

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자와 테스트바이오 중 어느 쪽이 더 위험한가요?

Answer: 제공된 정보만으로는 삼성테스트전자와 테스트바이오 중 어느 쪽이 더 위험한지 판단하기 어렵습니다. 현재 삼성테스트전자(900001)의 주가는 65,320 KRW이며, 평균 매수 가격 대비 8%의 unrealised 손실이 발생했습니다. 테스트바이오에 대한 정보가 없으므로 비교할 수 없습니다. /

Items:
- `e330:0` 65,320 KRW
- `e330:1` 8%

## e118

Facts:
- H1 Holding: 비트코인 (BTC), Bitcoin.
- H2 Quantity held: 0.25 BTC.
- H3 Average purchase price: 95,000,000 KRW.
- D1 Latest price (2026-09-25): 91,250,000 KRW.
- D2 Unrealised change vs. average purchase price: -3.95%.
- D3 Position value at the latest price: 22,812,500 KRW.
- M1 Bitcoin fell 4.1% over the last 7 days.
- M2 The 30-day high was 98,400,000 KRW on 2026-09-02.
- N1 A large exchange reported a temporary withdrawal halt on 2026-09-23 (fictional).
- Q1 비트코인 지금 들고 있어도 될까요?

Answer: 현재 비트코인을 보유하고 있으며, 0.25 BTC를 보유 중입니다. 최근 가격은 91,250,000 KRW이며, 구매 가격 대비 3.95%의 unrealized loss가 발생했습니다.  현재 상황으로 봤을 때 보유 여부를 결정하기 위해서는 추가적인 분석이 필요합니다. /

Items:
- `e118:0` 0.25 BTC
- `e118:1` 91,250,000 KRW
- `e118:2` 3.95%

## e489

Facts:
- H1 Holding: Zeta Apple Test Inc. (ZZAP), US listing.
- H2 Quantity held: 12 shares.
- H3 Average purchase price: 201.00 USD.
- D1 Latest price (2026-09-25): 188.40 USD.
- D2 Unrealised change vs. average purchase price: -6.27%.
- D3 Position value at the latest price: 2,260.80 USD.
- M1 The share price fell 6.5% over the last 20 sessions.
- M2 The stock trades at 24.3 times trailing earnings.
- N1 The company announced a 15,000,000,000 USD share buyback on 2026-09-18 (fictional).
- Q1 ZZAP의 PER이 높은 편인가요?

Answer: 제타 애플 테스트 Inc. (ZZAP)의 PER은 현재 주가 기준으로 평가됩니다. 최근 20일 동안 주가가 하락했으며, 현재 주가는 24.3배의 주가수익비율24.3입니다. 이 정보만으로는 ZZAP의 PER이 높은 편인지 판단하기에 근거가 부족합니다.

Items:
- `e489:0` 20
- `e489:1` 24.3
- `e489:2` 24.3

## e535

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 테스트바이오의 부채비율은 몇 퍼센트인가요?

Answer: 테스트바이오의 부채비율에 대한 정보는 제공되지 않았습니다. 현재 보유량은 40주 주이며, 평균 매입 가격은 1만 5,000원 KRW입니다. 최근 20일 동안 주가가 상승했으며, 특정 임상 시험 결과 발표가 예정되어 있습니다 2026년 11월.

Items:
- `e535:0` 40주
- `e535:1` 1만 5,000원
- `e535:2` 20
- `e535:3` 2026년 11월
- `e535:4` I: 최근 20일 동안 주가가 상승했으며, 특정 임상 시험 결과 발표가 예정되어 있습니다 2026년 11월.

## e162

Facts:
- H1 Holding: KRX 금현물 (KRX-GOLD), KRX gold spot.
- H2 Quantity held: 50 g.
- H3 Average purchase price: 132,000 KRW per g.
- D1 Latest price (2026-09-25): 148,500 KRW.
- D2 Unrealised change vs. average purchase price: +12.50%.
- D3 Position value at the latest price: 7,425,000 KRW.
- M1 KRX gold spot rose 2.3% over the last 30 days.
- M2 Daily trading volume averaged 310 kg over the last 20 sessions.
- N1 Central bank gold purchases were reported to continue in the third quarter (fictional).
- Q1 금현물의 내년 목표가는 얼마인가요?

Answer: 내년 목표가는 현재 제시된 사실에 명시되어 있지 않습니다. 30일 동안 KRX 금현물 가격은 2.3% 상승했으며, 최근 20일 동안 일일 거래량 평균은 310kg입니다. 중앙 은행의 금 매입이 3분기에도 계속될 것이라는 보고가 있습니다. /

Items:
- `e162:0` 30
- `e162:1` 2.3%
- `e162:2` 20
- `e162:3` 310kg
- `e162:4` I: 중앙 은행의 금 매입이 3분기에도 계속될 것이라는 보고가 있습니다.

## e133

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자가 계속 하락 중인데 괜찮은 건가요?

Answer: 현재 삼성테스트전자 주가는 평균 매수 가격보다 8.00% 하락했습니다. 지난 20거래일 동안 주가가 11.2% 하락했으며, 50일 이동평균선에도 미달합니다. 제공된 정보만으로는 투자 가치가 있는지 판단하기에 충분한 근거가 부족합니다. /

Items:
- `e133:0` 8.00%
- `e133:1` 20
- `e133:2` 11.2%
- `e133:3` 50

## e047

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자가 계속 하락 중인데 괜찮은 건가요?

Answer: 현재 삼성테스트전자의 주가는 평균 매수 가격보다 8% 하락했습니다. 최근 20거래일 동안 주가가 11.2% 하락했으며, 50일 이동평균 및 52주 저가에도 미치지 못합니다. 제시된 정보만으로는 투자 가치가 있는지 판단하기 어렵습니다. /

Items:
- `e047:0` 8%
- `e047:1` 20
- `e047:2` 11.2%
- `e047:3` 50
- `e047:4` 52주

## e369

Facts:
- H1 Holding: Zeta Apple Test Inc. (ZZAP), US listing.
- H2 Quantity held: 12 shares.
- H3 Average purchase price: 201.00 USD.
- D1 Latest price (2026-09-25): 188.40 USD.
- D2 Unrealised change vs. average purchase price: -6.27%.
- D3 Position value at the latest price: 2,260.80 USD.
- M1 The share price fell 6.5% over the last 20 sessions.
- M2 The stock trades at 24.3 times trailing earnings.
- N1 The company announced a 15,000,000,000 USD share buyback on 2026-09-18 (fictional).
- Q1 ZZAP 자사주 매입 규모가 얼마인가요?

Answer: 질문하신 ZZAP의 자사주 매입 규모는 150억 달러입니다. 이는 2026년 9월 18일에 발표된 사실입니다. 주어진 정보만으로는 추가적인 판단은 어렵습니다. /

Items:
- `e369:0` 150억 달러
- `e369:1` 2026년 9월 18일
- `e369:2` I: 질문하신 ZZAP의 자사주 매입 규모는 150억 달러입니다.

## e459

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자 평단 대비 지금 손실이 얼마나 되나요?

Answer: 현재 삼성테스트전자 주가는 65,320 KRW이고, 평균 매수 가격은 71,000 KRW였습니다 {D1b, H3}. 따라서 현재 실현된 손실은 주당 평균 매수 가격에서 현재 주가를 뺀 값만큼 됩니다 -8.00%. 제공된 사실만으로는 평단 대비 정확한 손실액을 계산하기 어렵습니다. /

Items:
- `e459:0` 65,320 KRW
- `e459:1` 71,000 KRW
- `e459:2` 8.00%

## e115

Facts:
- H1 Holding: 비트코인 (BTC), Bitcoin.
- H2 Quantity held: 0.25 BTC.
- H3 Average purchase price: 95,000,000 KRW.
- D1 Latest price (2026-09-25): 91,250,000 KRW.
- D2 Unrealised change vs. average purchase price: -3.95%.
- D3 Position value at the latest price: 22,812,500 KRW.
- M1 Bitcoin fell 4.1% over the last 7 days.
- M2 The 30-day high was 98,400,000 KRW on 2026-09-02.
- N1 A large exchange reported a temporary withdrawal halt on 2026-09-23 (fictional).
- Q1 비트코인이랑 금현물 비교해 주세요.

Answer: 현재 비트코인의 가격은 평균 매수 가격보다 3.95% 하락했으며, 7일 동안 4.1% 하락했습니다. 최근 30일 최고가는 98,400,000 KRW입니다. 비트코인과 금 현물 비교에 대한 직접적인 정보는 제공되지 않습니다. /

Items:
- `e115:0` 3.95%
- `e115:1` 4.1%
- `e115:2` 30
- `e115:3` 98,400,000 KRW

## e046

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자가 계속 하락 중인데 괜찮은 건가요?

Answer: 현재 주가는 평균 매수 가격보다 8% 하락했으며, 지난 20거래일 동안 11.2% 하락했습니다. 최근 주가는 50일 이동평균치(69,800 KRW)보다 낮고, 52주 저가(61,500 KRW)와도 가깝습니다. 제공된 정보만으로는 삼성테스트전자의 주가가 괜찮은지 판단하기 어렵습니다. /

Items:
- `e046:0` 8%
- `e046:1` 20
- `e046:2` 11.2%
- `e046:3` 50
- `e046:4` 69,800 KRW
- `e046:5` 52주
- `e046:6` 61,500 KRW

## e181

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 테스트바이오 임상 결과는 언제 나오나요?

Answer: 테스트바이오(900006)의 임상 결과 발표 시점은 2026년 11월로 예상됩니다 2026년 11월. 현재 테스트바이오 주식 보유량은 40주이며, 평균 매입 가격은 1만 5,000원 KRW입니다. 주가 상승률은 최근 20일 동안 27.4%이며, 2026년 9월 24일 거래량은 20일 평균의 3.2 배였습니다 20.

Items:
- `e181:0` 2026년 11월
- `e181:1` 2026년 11월
- `e181:2` 40주
- `e181:3` 1만 5,000원
- `e181:4` 20
- `e181:5` 27.4%
- `e181:6` 2026년 9월 24일
- `e181:7` 20
- `e181:8` 3.2
- `e181:9` 20
- `e181:10` I: 테스트바이오(900006)의 임상 결과 발표 시점은 2026년 11월로 예상됩니다 2026년 11월.

## e588

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자 평단 대비 지금 손실이 얼마나 되나요?

Answer: 현재 삼성테스트전자 주가는 평단가 대비 -8.00% -8.00%입니다. 이는 지난 20일 동안 주가가 11.2% 11.2% 하락했으며, 현재 주가는 65만 3,200원 653,200 KRW입니다.  평단가보다 손실이 얼마나 되는지 정확히 알기 위해서는 평단가를 알아야 합니다.

Items:
- `e588:0` 8.00%
- `e588:1` 8.00%
- `e588:2` 20
- `e588:3` 11.2%
- `e588:4` 11.2%
- `e588:5` 65만 3,200원
- `e588:6` 653,200 KRW

## e130

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 테스트바이오는 최근에 얼마나 올랐나요?

Answer: 최근 테스트바이오 주가는 평균 매수 가격 대비 +23.00% 23.00% 상승했습니다. 지난 20 거래일 동안 주가가 상승 27.4%했으며, 특히 2026-09-24에는 거래량이 평균 거래량의 3.2 배로 증가 2026년 9월 24일했습니다. 테스트바이오의 주가 상승에 대한 추가적인 정보는 현재 제공된 사실만으로는 파악하기 어렵습니다. /

Items:
- `e130:0` 23.00%
- `e130:1` 23.00%
- `e130:2` 20
- `e130:3` 27.4%
- `e130:4` 2026-09-24
- `e130:5` 3.2
- `e130:6` 2026년 9월 24일

## e098

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자와 테스트바이오 중 어느 쪽이 더 위험한가요?

Answer: 현재 삼성테스트전자 주식 보유량은 10주이며, 평균 매수 가격은 71,000원입니다. 최신 주가는 65,320원으로, 평균 매수 가격 대비 8% 하락했습니다. 최근 20일 동안 주가가 11.2% 하락했으며, 50일 이동평균 및 52주 저가보다 낮은 수준입니다. / The facts provided do not offer a direct comparison of risk between Samsung Test Electronics and Testbio. However, the provided information indicates that Samsung Test Electronics is currently experiencing a price decline. Therefore, the evidence is insufficient to determine which company is riskier.

Items:
- `e098:0` 10주
- `e098:1` 71,000원
- `e098:2` 65,320원
- `e098:3` 8%
- `e098:4` 20
- `e098:5` 11.2%
- `e098:6` 50
- `e098:7` 52주

## e232

Facts:
- H1 Holding: KRX 금현물 (KRX-GOLD), KRX gold spot.
- H2 Quantity held: 50 g.
- H3 Average purchase price: 132,000 KRW per g.
- D1 Latest price (2026-09-25): 148,500 KRW.
- D2 Unrealised change vs. average purchase price: +12.50%.
- D3 Position value at the latest price: 7,425,000 KRW.
- M1 KRX gold spot rose 2.3% over the last 30 days.
- M2 Daily trading volume averaged 310 kg over the last 20 sessions.
- N1 Central bank gold purchases were reported to continue in the third quarter (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 현재 포트폴리오는 KRX 금현물 50g을 보유하고 있으며, 평균 매입 가격은 132,000 KRW입니다. 최근 30일 동안 KRX 금 spot은 상승했으며, 중앙 은행은 3분기에도 금 구매를 계속할 것으로 예상됩니다. 현재 포트폴리오의 가치는 7,425,000 KRW이며, 12.5%의 미실현 수익을 기록하고 있습니다. /

Items:
- `e232:0` 50g
- `e232:1` 132,000 KRW
- `e232:2` 30
- `e232:3` 7,425,000 KRW
- `e232:4` 12.5%
- `e232:5` I: 최근 30일 동안 KRX 금 spot은 상승했으며, 중앙 은행은 3분기에도 금 구매를 계속할 것으로 예상됩니다.

## e568

Facts:
- H1 Holding: KRX 금현물 (KRX-GOLD), KRX gold spot.
- H2 Quantity held: 50 g.
- H3 Average purchase price: 132,000 KRW per g.
- D1 Latest price (2026-09-25): 148,500 KRW.
- D2 Unrealised change vs. average purchase price: +12.50%.
- D3 Position value at the latest price: 7,425,000 KRW.
- M1 KRX gold spot rose 2.3% over the last 30 days.
- M2 Daily trading volume averaged 310 kg over the last 20 sessions.
- N1 Central bank gold purchases were reported to continue in the third quarter (fictional).
- Q1 금현물의 내년 목표가는 얼마인가요?

Answer: 내년 목표가는 제시된 사실만으로는 알 수 없습니다. 현재 금현물 보유량은 50g 50g이며, 평균 매입 가격은 13만 2,000원 132,000 KRW 입니다. 최근 가격은 14만 8,500원 148,500 KRW이며, 이는 평균 매입 가격 대비 +12.50% 12.50% 상승했습니다. /

Items:
- `e568:0` 50g
- `e568:1` 50g
- `e568:2` 13만 2,000원
- `e568:3` 132,000 KRW
- `e568:4` 14만 8,500원
- `e568:5` 148,500 KRW
- `e568:6` 12.50%
- `e568:7` 12.50%

## e385

Facts:
- H1 Holding: KRX 금현물 (KRX-GOLD), KRX gold spot.
- H2 Quantity held: 50 g.
- H3 Average purchase price: 132,000 KRW per g.
- D1 Latest price (2026-09-25): 148,500 KRW.
- D2 Unrealised change vs. average purchase price: +12.50%.
- D3 Position value at the latest price: 7,425,000 KRW.
- M1 KRX gold spot rose 2.3% over the last 30 days.
- M2 Daily trading volume averaged 310 kg over the last 20 sessions.
- N1 Central bank gold purchases were reported to continue in the third quarter (fictional).
- Q1 금현물 수익률은 어떤가요?

Answer: 현재 금현물 보유량은 50g이며, 구매 가격은 132,000 KRW입니다. 최근 가격은 148,500 KRW이며, 현재 보유량의 12.50%의 unrealised profit을 보고 있습니다. 지난 30일 동안 금현물 가격은 2.3% 상승했습니다. /

Items:
- `e385:0` 50g
- `e385:1` 132,000 KRW
- `e385:2` 148,500 KRW
- `e385:3` 12.50%
- `e385:4` 30
- `e385:5` 2.3%

## e466

Facts:
- H1 Holding: Zeta Apple Test Inc. (ZZAP), US listing.
- H2 Quantity held: 12 shares.
- H3 Average purchase price: 201.00 USD.
- D1 Latest price (2026-09-25): 188.40 USD.
- D2 Unrealised change vs. average purchase price: -6.27%.
- D3 Position value at the latest price: 2,260.80 USD.
- M1 The share price fell 6.5% over the last 20 sessions.
- M2 The stock trades at 24.3 times trailing earnings.
- N1 The company announced a 15,000,000,000 USD share buyback on 2026-09-18 (fictional).
- Q1 ZZAP의 PER이 높은 편인가요?

Answer: 제타 애플 테스트 주식의 주가수익비율(PER)은 24.3배입니다. 이것이 높다고 판단하려면 시장 평균 PER과 비교가 필요합니다. 제시된 정보만으로는 ZZAP의 PER이 높은 편인지 여부를 판단하기에 충분한 근거가 없습니다. /

Items:
- `e466:0` 24.3

## e314

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 테스트바이오 임상 결과는 언제 나오나요?

Answer: 테스트바이오의 임상 결과 발표 일정에 대한 정보는 현재 제공된 사실만으로는 알 수 없습니다. 2026년 11월에 임상 2상 결과 발표가 예상된다는 정보는 있지만, 이는 예상일 뿐입니다. 제공된 정보만으로는 더 이상의 결론을 내릴 수 없습니다. /

Items:
- `e314:0` 2026년 11월
- `e314:1` I: 테스트바이오의 임상 결과 발표 일정에 대한 정보는 현재 제공된 사실만으로는 알 수 없습니다.
- `e314:2` I: 2026년 11월에 임상 2상 결과 발표가 예상된다는 정보는 있지만, 이는 예상일 뿐입니다.

## e106

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자가 계속 하락 중인데 괜찮은 건가요?

Answer: 삼성테스트전자 주가가 계속 하락 중입니다. 지난 20개 증권 거래 세션 동안 주가가 20 11.2% 하락했고, 현재 주가는 6만 5,320원 65,320 KRW로 50일 이동 평균치 6만 9,800원 69,800 KRW보다 낮습니다.  제공된 정보만으로는 현재 상황이 괜찮은지 여부를 판단하기 어렵습니다. /

Items:
- `e106:0` 20
- `e106:1` 20
- `e106:2` 11.2%
- `e106:3` 6만 5,320원
- `e106:4` 65,320 KRW
- `e106:5` 50
- `e106:6` 6만 9,800원
- `e106:7` 69,800 KRW

## e049

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 삼성테스트전자와 테스트바이오 중 어느 쪽이 더 위험한가요?

Answer: 제시된 사실만으로는 삼성테스트전자와 테스트바이오 중 어느 쪽이 더 위험한지 판단하기 어렵습니다. 테스트바이오의 주가는 최근 27.4% 상승했으며, 최근 거래량은 평소보다 많았습니다 3.2. 11월에 임상 시험 결과가 발표될 예정입니다 2026년 11월.

Items:
- `e049:0` 27.4%
- `e049:1` 3.2
- `e049:2` 11
- `e049:3` 2026년 11월
- `e049:4` I: 11월에 임상 시험 결과가 발표될 예정입니다 2026년 11월.

## e358

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 테스트바이오는 최근에 얼마나 올랐나요?

Answer: 테스트바이오 주가는 지난 20개 거래일 동안 27.4% 상승했습니다 27.4%. 가장 최근 주가는 18,450 KRW입니다 1만 8,450원. 평균 매수 가격은 15,000 KRW입니다 1만 5,000원. /

Items:
- `e358:0` 20
- `e358:1` 27.4%
- `e358:2` 27.4%
- `e358:3` 18,450 KRW
- `e358:4` 1만 8,450원
- `e358:5` 15,000 KRW
- `e358:6` 1만 5,000원

## e032

Facts:
- H1 Holding: KRX 금현물 (KRX-GOLD), KRX gold spot.
- H2 Quantity held: 50 g.
- H3 Average purchase price: 132,000 KRW per g.
- D1 Latest price (2026-09-25): 148,500 KRW.
- D2 Unrealised change vs. average purchase price: +12.50%.
- D3 Position value at the latest price: 7,425,000 KRW.
- M1 KRX gold spot rose 2.3% over the last 30 days.
- M2 Daily trading volume averaged 310 kg over the last 20 sessions.
- N1 Central bank gold purchases were reported to continue in the third quarter (fictional).
- Q1 KRX 금 더 사도 될까요?

Answer: 제 현재 권고는 KRX 금 현물 포지션을 유지하는 것입니다. 현재 50g을 보유하고 있으며, 평균 매입 가격은 132,000 KRW이고 현재 가격은 148,500 KRW입니다. 추가 매수를 추천하려면 명확한 목표 수익 또는 시장 변화에 따른 매도 계획이 추가될 필요가 있습니다. /

Items:
- `e032:0` 50g
- `e032:1` 132,000 KRW
- `e032:2` 148,500 KRW

## e156

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자가 계속 하락 중인데 괜찮은 건가요?

Answer: 현재 삼성테스트전자 주가는 65,320 KRW이며, 매수 가격 71,000 KRW 대비 8.00% 하락했습니다. 기존 10주를 보유하고 있으며, 현재 주식 가치는 653,200 KRW입니다. Q3 전망이 좋지 않다는 점은 우려되지만 삼성 생태계 내 위치와 저평가 가능성을 고려하여 현재 보유 전략을 유지하는 것이 적절하다고 판단됩니다. /

Items:
- `e156:0` 65,320 KRW
- `e156:1` 71,000 KRW
- `e156:2` 8.00%
- `e156:3` 10주
- `e156:4` 653,200 KRW
- `e156:5` I: Q3 전망이 좋지 않다는 점은 우려되지만 삼성 생태계 내 위치와 저평가 가능성을 고려하여 현재 보유 전략을 유지하는 것이 적절하다고 판단됩니다.

## e362

Facts:
- H1 Holding: KRX 금현물 (KRX-GOLD), KRX gold spot.
- H2 Quantity held: 50 g.
- H3 Average purchase price: 132,000 KRW per g.
- D1 Latest price (2026-09-25): 148,500 KRW.
- D2 Unrealised change vs. average purchase price: +12.50%.
- D3 Position value at the latest price: 7,425,000 KRW.
- M1 KRX gold spot rose 2.3% over the last 30 days.
- M2 Daily trading volume averaged 310 kg over the last 20 sessions.
- N1 Central bank gold purchases were reported to continue in the third quarter (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: KRX 금현물 (KRX-GOLD) 보유량은 50g이며, 평균 매입 가격은 13만 2,000원원/g 입니다. 최신 가격은 14만 8,500원원이며, 평균 매입 가격 대비 실현 수익은 +12.50%입니다. 최근 30일 동안 KRX 금 현물 가격은 2.3% 상승했으며, 중앙 은행의 금 구매가 지속될 것으로 예상됩니다 {N1}.

Items:
- `e362:0` 50g
- `e362:1` 13만 2,000원
- `e362:2` 14만 8,500원
- `e362:3` 12.50%
- `e362:4` 30
- `e362:5` 2.3%
- `e362:6` I: 최근 30일 동안 KRX 금 현물 가격은 2.3% 상승했으며, 중앙 은행의 금 구매가 지속될 것으로 예상됩니다 {N1}.

## e537

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자 52주 최저가 근처인가요?

Answer: 네, 삼성테스트전자 주가는 현재 52주 최저가 6만 1,500원 근처입니다. 최근 20거래일 동안 주가가 11.2% 하락했습니다 11.2%. 현재 주가는 이동평균선 6만 9,800원 아래에 있으며, 과거 평균 매수 가격보다 8% 하락했습니다 -8.00%.

Items:
- `e537:0` 52주
- `e537:1` 6만 1,500원
- `e537:2` 20
- `e537:3` 11.2%
- `e537:4` 11.2%
- `e537:5` 6만 9,800원
- `e537:6` 8%
- `e537:7` 8.00%

## e619

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 테스트바이오는 최근에 얼마나 올랐나요?

Answer: 최근 테스트바이오 주가는 2026년 9월 25일 기준 18,450 KRW로, 평균 매수 가격 15,000 KRW 대비 23.00% 상승했습니다. 지난 20거래일 동안 주가는 27.4% 상승했으며, 2026년 9월 24일 거래량은 20일 평균 거래량의 3.2배였습니다. 임상 2상 시험 결과 발표가 2026년 11월에 예상되는 점도 긍정적인 요인으로 작용할 수 있습니다. /

Items:
- `e619:0` 2026년 9월 25일
- `e619:1` 18,450 KRW
- `e619:2` 15,000 KRW
- `e619:3` 23.00%
- `e619:4` 20
- `e619:5` 27.4%
- `e619:6` 2026년 9월 24일
- `e619:7` 20
- `e619:8` 3.2
- `e619:9` 2026년 11월
- `e619:10` I: 임상 2상 시험 결과 발표가 2026년 11월에 예상되는 점도 긍정적인 요인으로 작용할 수 있습니다.

## e144

Facts:
- H1 Holding: Zeta Apple Test Inc. (ZZAP), US listing.
- H2 Quantity held: 12 shares.
- H3 Average purchase price: 201.00 USD.
- D1 Latest price (2026-09-25): 188.40 USD.
- D2 Unrealised change vs. average purchase price: -6.27%.
- D3 Position value at the latest price: 2,260.80 USD.
- M1 The share price fell 6.5% over the last 20 sessions.
- M2 The stock trades at 24.3 times trailing earnings.
- N1 The company announced a 15,000,000,000 USD share buyback on 2026-09-18 (fictional).
- Q1 ZZSP와 ZZAP 둘 다 괜찮나요?

Answer: 제타 애플 테스트 Inc. (ZZAP) 주식을 12주 보유하고 있으며, 평균 매입 가격은 201.00 USD입니다. 현재 주가는 188.40 USD로, 매입 가격 대비 6.27% 감소했습니다. 주가 하락과 최근 20일 동안의 하락률, 그리고 1억 5천억 달러 규모의 주식 매입 계획이 발표된 점을 고려할 때, 투자 결정은 추가 정보 없이 판단하기 어렵습니다. /

Items:
- `e144:0` 12주
- `e144:1` 201.00 USD
- `e144:2` 188.40 USD
- `e144:3` 6.27%
- `e144:4` 20
- `e144:5` 1억 5천억 달러
- `e144:6` I: 주가 하락과 최근 20일 동안의 하락률, 그리고 1억 5천억 달러 규모의 주식 매입 계획이 발표된 점을 고려할 때, 투자 결정은 추가 정보 없이 판단하기 어렵습니다.

## e515

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 테스트바이오(900006) 주식 40주를 기준으로 평가합니다. 현재 주가는 구매 가격인 1만 5,000원 대비 23.00% 상승했으며, 이는 지난 20일 동안의 주가 상승률인 27.4%과도 일치합니다. 11월에 임상 2상 시험 결과가 발표될 예정입니다 2026년 11월. /

Items:
- `e515:0` 40주
- `e515:1` 1만 5,000원
- `e515:2` 23.00%
- `e515:3` 20
- `e515:4` 27.4%
- `e515:5` 11
- `e515:6` 2026년 11월
- `e515:7` I: 11월에 임상 2상 시험 결과가 발표될 예정입니다 2026년 11월.

## e427

Facts:
- H1 Holding: Zeta S&P 500 Test ETF Trust (ZZSP), US listing.
- H2 Quantity held: 2.5 shares.
- H3 Average purchase price: 480.00 USD.
- D1 Latest price (2026-09-25): 512.30 USD.
- D2 Unrealised change vs. average purchase price: +6.73%.
- D3 Position value at the latest price: 1,280.75 USD.
- M1 The ETF rose 1.8% over the last 20 sessions.
- M2 The ETF is 2.1% below its all-time high of 523.30 USD.
- N1 Index constituents reported mixed third-quarter guidance (fictional).
- Q1 ZZSP의 운용보수는 얼마인가요?

Answer: 제타 S&P 500 500 시험 ETF 신탁 (ZZSP)의 운용 보수에 대한 정보는 제공된 사실에 포함되어 있지 않습니다. 제공된 사실에는 ETF의 과거 성과 및 보유량과 관련된 정보만 언급되어 있습니다. 따라서 정보가 부족하여 운용 보수에 대해 답변할 수 없습니다. /

Items:
- `e427:0` 500
- `e427:1` 500

## e578

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 테스트바이오는 최근에 얼마나 올랐나요?

Answer: 테스트바이오 주가는 지난 20거래일 동안 상승했습니다 27.4%. 최근 20거래일 동안 주가가 상승한 비율은 27.4%입니다 20. 다른 정보는 현재 제공되지 않습니다. /

Items:
- `e578:0` 20
- `e578:1` 27.4%
- `e578:2` 20
- `e578:3` 27.4%
- `e578:4` 20

## e491

Facts:
- H1 Holding: 비트코인 (BTC), Bitcoin.
- H2 Quantity held: 0.25 BTC.
- H3 Average purchase price: 95,000,000 KRW.
- D1 Latest price (2026-09-25): 91,250,000 KRW.
- D2 Unrealised change vs. average purchase price: -3.95%.
- D3 Position value at the latest price: 22,812,500 KRW.
- M1 Bitcoin fell 4.1% over the last 7 days.
- M2 The 30-day high was 98,400,000 KRW on 2026-09-02.
- N1 A large exchange reported a temporary withdrawal halt on 2026-09-23 (fictional).
- Q1 비트코인 평가 손익이 어떻게 되나요?

Answer: 현재 비트코인 보유량은 0.25 BTC이며, 평균 매수 가격은 9억 5천만 원입니다. 현재 가격은 9억 1천 2백만 원으로, 평균 매수 가격 대비 3.95%의 손실이 발생했습니다. 7일 동안 비트코인 가격은 4.1% 하락했으며, 최근 30일 최고가는 9억 8천 4백만 원입니다. /

Items:
- `e491:0` 0.25 BTC
- `e491:1` 9억 5천만 원
- `e491:2` 9억 1천 2백만 원
- `e491:3` 3.95%
- `e491:4` 4.1%
- `e491:5` 30
- `e491:6` 9억 8천 4백만 원

## e354

Facts:
- H1 Holding: KRX 금현물 (KRX-GOLD), KRX gold spot.
- H2 Quantity held: 50 g.
- H3 Average purchase price: 132,000 KRW per g.
- D1 Latest price (2026-09-25): 148,500 KRW.
- D2 Unrealised change vs. average purchase price: +12.50%.
- D3 Position value at the latest price: 7,425,000 KRW.
- M1 KRX gold spot rose 2.3% over the last 30 days.
- M2 Daily trading volume averaged 310 kg over the last 20 sessions.
- N1 Central bank gold purchases were reported to continue in the third quarter (fictional).
- Q1 KRX 금 더 사도 될까요?

Answer: 최근 30일 동안 KRX 금 현물 가격이 2.3% 상승했으며, 현재 KRX 금 현물 보유량은 50g으로, 평균 매입 가격 대비 12.5%의 실현되지 않은 이익을 내고 있습니다. 중앙은행의 금 구매가 지속될 것이라는 소식이 있으며, 최근 일일 거래량은 310kg으로 나타납니다. 현재의 시장 상황과 보유 현황을 고려할 때 추가 매수 여부를 결정하기 위해서는 더 많은 정보가 필요합니다. /

Items:
- `e354:0` 30
- `e354:1` 2.3%
- `e354:2` 50g
- `e354:3` 12.5%
- `e354:4` 310kg
- `e354:5` I: 중앙은행의 금 구매가 지속될 것이라는 소식이 있으며, 최근 일일 거래량은 310kg으로 나타납니다.

## e394

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 삼성테스트전자 {900001} 보유 현황은 10주 10주, 평균 매입 가격은 71,000 KRW 7만 1,000원이며 현재 주가는 65,320 KRW 6만 5,320원 입니다. 지난 20일 동안 주가는 11.2% 하락 20 했고 50일 이동평균선 50 아래에 있습니다 6만 9,800원. 이는 disappointing Q3 outlook 18%으로 인해 발생한 것으로 보입니다. /

Items:
- `e394:0` 10주
- `e394:1` 10주
- `e394:2` 71,000 KRW
- `e394:3` 7만 1,000원
- `e394:4` 65,320 KRW
- `e394:5` 6만 5,320원
- `e394:6` 20
- `e394:7` 11.2%
- `e394:8` 20
- `e394:9` 50
- `e394:10` 50
- `e394:11` 6만 9,800원
- `e394:12` 18%

## e224

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자 평단 대비 지금 손실이 얼마나 되나요?

Answer: 현재 주가는 평균 매수 가격보다 8.00% 하락했습니다 -8.00%. 이는 65,320 KRW의 현재 가격과 71,000 KRW의 평균 매수 가격의 차이로 계산됩니다 {H3, D2}. 현재 주가가 61,500 KRW의 52주 저가보다 낮은 것은 사실입니다 6만 1,500원.

Items:
- `e224:0` 8.00%
- `e224:1` 8.00%
- `e224:2` 65,320 KRW
- `e224:3` 71,000 KRW
- `e224:4` 61,500 KRW
- `e224:5` 52주
- `e224:6` 6만 1,500원

## e368

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 테스트바이오 비중을 줄여야 할까요?

Answer: 현재 테스트바이오 보유량은 40주이며 평균 매수 가격은 15,000원입니다 {H2, H3}. 최근 20일 동안 주가가 27.4% 상승했으며, 거래량은 평균보다 3.2배 높았습니다 {M1, M2}. 추가적인 정보가 없어 비중 감소 여부를 판단하기는 어렵습니다.

Items:
- `e368:0` 40주
- `e368:1` 15,000원
- `e368:2` 20
- `e368:3` 27.4%
- `e368:4` 3.2

## e318

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자 52주 최저가 근처인가요?

Answer: 삼성테스트전자 주가는 2026년 9월 25일 현재 65,320 KRW입니다. 이는 20일 동안 11.2% 하락했으며, 50일 이동 평균치(69,800 KRW) 및 52주 저가(61,500 KRW) 모두 아래에 있습니다. 따라서 현재 주가는 52주 저가 근처에 있음을 알 수 있습니다.

Items:
- `e318:0` 2026년 9월 25일
- `e318:1` 65,320 KRW
- `e318:2` 20
- `e318:3` 11.2%
- `e318:4` 50
- `e318:5` 69,800 KRW
- `e318:6` 52주
- `e318:7` 61,500 KRW
- `e318:8` 52주

## e440

Facts:
- H1 Holding: Zeta Apple Test Inc. (ZZAP), US listing.
- H2 Quantity held: 12 shares.
- H3 Average purchase price: 201.00 USD.
- D1 Latest price (2026-09-25): 188.40 USD.
- D2 Unrealised change vs. average purchase price: -6.27%.
- D3 Position value at the latest price: 2,260.80 USD.
- M1 The share price fell 6.5% over the last 20 sessions.
- M2 The stock trades at 24.3 times trailing earnings.
- N1 The company announced a 15,000,000,000 USD share buyback on 2026-09-18 (fictional).
- Q1 ZZAP 자사주 매입 규모가 얼마인가요?

Answer: 제타 애플 테스트 주식의 자사주 매입 규모에 대한 정보는 현재 제공된 사실에 포함되어 있지 않습니다. 제공된 사실에는 매입 빈도, 매입 가격 또는 매입된 주식 수를 알 수 없습니다. 따라서 자사주 매입 규모를 알기에 충분한 정보가 없습니다. /

Items:
- `e440:0` I: 제타 애플 테스트 주식의 자사주 매입 규모에 대한 정보는 현재 제공된 사실에 포함되어 있지 않습니다.
- `e440:1` I: 따라서 자사주 매입 규모를 알기에 충분한 정보가 없습니다.

## e302

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 테스트바이오의 부채비율은 몇 퍼센트인가요?

Answer: 테스트바이오의 부채비율에 대한 정보는 제공되지 않았습니다. 현재 보유량은 40주이고, 평균 매입 가격은 15,000원입니다. 최근 주가 상승률은 27.4%이며, 최근 20일 동안 거래량은 평균 거래량의 3.2배였습니다. /

Items:
- `e302:0` 40주
- `e302:1` 15,000원
- `e302:2` 27.4%
- `e302:3` 20
- `e302:4` 3.2

## e555

Facts:
- H1 Holding: Zeta S&P 500 Test ETF Trust (ZZSP), US listing.
- H2 Quantity held: 2.5 shares.
- H3 Average purchase price: 480.00 USD.
- D1 Latest price (2026-09-25): 512.30 USD.
- D2 Unrealised change vs. average purchase price: +6.73%.
- D3 Position value at the latest price: 1,280.75 USD.
- M1 The ETF rose 1.8% over the last 20 sessions.
- M2 The ETF is 2.1% below its all-time high of 523.30 USD.
- N1 Index constituents reported mixed third-quarter guidance (fictional).
- Q1 Zeta S&P 500 Test ETF Trust 평가액이 얼마인가요?

Answer: 현재 Zeta S&P 500 Test ETF Trust (ZZSP) 보유량은 2.5 주입니다 2.5주. 마지막 거래 가격은 512.30 USD 512.30달러이며, 평균 매수 가격인 480.00 USD 480.00달러 대비 6.73% 상승했습니다 +6.73%. 따라서 현재 포지션 가치는 1,280.75 USD 1,280.75달러 입니다. /

Items:
- `e555:0` 500
- `e555:1` 2.5 주
- `e555:2` 2.5주
- `e555:3` 512.30 USD
- `e555:4` 512.30달러
- `e555:5` 480.00 USD
- `e555:6` 480.00달러
- `e555:7` 6.73%
- `e555:8` 6.73%
- `e555:9` 1,280.75 USD
- `e555:10` 1,280.75달러

## e637

Facts:
- H1 Holding: Zeta S&P 500 Test ETF Trust (ZZSP), US listing.
- H2 Quantity held: 2.5 shares.
- H3 Average purchase price: 480.00 USD.
- D1 Latest price (2026-09-25): 512.30 USD.
- D2 Unrealised change vs. average purchase price: +6.73%.
- D3 Position value at the latest price: 1,280.75 USD.
- M1 The ETF rose 1.8% over the last 20 sessions.
- M2 The ETF is 2.1% below its all-time high of 523.30 USD.
- N1 Index constituents reported mixed third-quarter guidance (fictional).
- Q1 ZZSP는 계속 보유해도 되나요?

Answer: 현재 ZZSP 보유 중이며 6.73%의 unrealized gains을 보고 있습니다. 마지막 거래일인 2026년 9월 25일 가격은 512.30 USD입니다. 미래의 실적 보고와 시장 심리를 지속적으로 주시하며 추가 투자를 결정하는 것이 좋겠습니다. /

Items:
- `e637:0` 6.73%
- `e637:1` 2026년 9월 25일
- `e637:2` 512.30 USD

## e350

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 테스트바이오의 부채비율은 몇 퍼센트인가요?

Answer: 제시된 사실만으로는 테스트바이오의 부채비율을 알 수 없습니다. 주식 보유 현황과 가격 변동, 시장 및 뉴스 정보는 확인할 수 있지만, 부채 관련 정보는 포함되어 있지 않습니다. 따라서 현재 정보로는 부채비율에 대한 결론을 내릴 수 없습니다. /

Items:
- `e350:0` I: 주식 보유 현황과 가격 변동, 시장 및 뉴스 정보는 확인할 수 있지만, 부채 관련 정보는 포함되어 있지 않습니다.

## e400

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자의 배당금은 얼마인가요?

Answer: 제공된 사실만으로는 삼성테스트전자(900001)의 배당금 정보를 알 수 없습니다. 현재 주식 보유량은 10주이며 최근 구매 가격은 71,000원입니다.  최근 주가 변동은 주식의 현재 가치를 나타내지만 배당금과는 직접적인 관련이 없습니다. /

Items:
- `e400:0` 10주
- `e400:1` 71,000원

## e259

Facts:
- H1 Holding: Zeta S&P 500 Test ETF Trust (ZZSP), US listing.
- H2 Quantity held: 2.5 shares.
- H3 Average purchase price: 480.00 USD.
- D1 Latest price (2026-09-25): 512.30 USD.
- D2 Unrealised change vs. average purchase price: +6.73%.
- D3 Position value at the latest price: 1,280.75 USD.
- M1 The ETF rose 1.8% over the last 20 sessions.
- M2 The ETF is 2.1% below its all-time high of 523.30 USD.
- N1 Index constituents reported mixed third-quarter guidance (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 전체 포트폴리오 점검을 요청하셨습니다. 현재 포트폴리오에는 Zeta S&P 500 500 Test ETF Trust (ZZSP) 2.5주가 보유되어 있으며, 평균 매수 가격은 480.00달러 480.00 USD 입니다. 최근 20개 거래일 동안 해당 ETF가 1.8% 상승했으며, 현재 가격은 512.30달러 512.30 USD로, 매수 가격 대비 +6.73% 6.73%의 unrealized gain을 기록하고 있습니다. /

Items:
- `e259:0` 500
- `e259:1` 500
- `e259:2` 2.5주
- `e259:3` 480.00달러
- `e259:4` 480.00 USD
- `e259:5` 20
- `e259:6` 1.8%
- `e259:7` 512.30달러
- `e259:8` 512.30 USD
- `e259:9` 6.73%
- `e259:10` 6.73%

## e319

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자와 테스트바이오 중 어느 쪽이 더 위험한가요?

Answer: 제공된 사실만으로는 삼성테스트전자와 테스트바이오 중 어느 쪽이 더 위험한지 판단하기 어렵습니다. 테스트바이오에 대한 정보는 제공되지 않았습니다. 삼성테스트전자 역시 최근 주가 하락과 실적 전망 수정으로 인해 위험이 있음을 시사합니다.

Items:
- `e319:0` I: 삼성테스트전자 역시 최근 주가 하락과 실적 전망 수정으로 인해 위험이 있음을 시사합니다.

## e366

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 삼성테스트전자와 테스트바이오 중 어느 쪽이 더 위험한가요?

Answer: 제시된 정보만으로는 삼성테스트전자와 테스트바이오 중 어느 쪽이 더 위험한지 판단하기 어렵습니다. 테스트바이오의 현재 보유 주식은 40주이며, 평균 매수 가격과 현재 주가를 비교했을 때 23%의 미실현 수익이 발생했습니다. 삼성테스트전자 관련 정보는 제공되지 않았습니다.

Items:
- `e366:0` 40주
- `e366:1` 23%

## e451

Facts:
- H1 Holding: 테스트바이오 (900006), Korean listing.
- H2 Quantity held: 40 shares.
- H3 Average purchase price: 15,000 KRW.
- D1 Latest price (2026-09-25): 18,450 KRW.
- D2 Unrealised change vs. average purchase price: +23.00%.
- D3 Position value at the latest price: 738,000 KRW.
- M1 The share price rose 27.4% over the last 20 sessions.
- M2 Trading volume was 3.2 times its 20-day average on 2026-09-24.
- N1 A phase 2 trial result is expected in November 2026 (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 제 포트폴리오에는 테스트바이오 주식 40주가 있습니다. 구매 시점의 평균 가격은 15,000원이었고, 현재 18,450원에 보유하고 있어 23.00%의 실현된 수익이 있습니다. 현재 포트폴리오에 대한 종합적인 점검을 위해서는 더 많은 정보가 필요합니다. /

Items:
- `e451:0` 40주
- `e451:1` 15,000원
- `e451:2` 18,450원
- `e451:3` 23.00%

## e658

Facts:
- H1 Holding: Zeta Apple Test Inc. (ZZAP), US listing.
- H2 Quantity held: 12 shares.
- H3 Average purchase price: 201.00 USD.
- D1 Latest price (2026-09-25): 188.40 USD.
- D2 Unrealised change vs. average purchase price: -6.27%.
- D3 Position value at the latest price: 2,260.80 USD.
- M1 The share price fell 6.5% over the last 20 sessions.
- M2 The stock trades at 24.3 times trailing earnings.
- N1 The company announced a 15,000,000,000 USD share buyback on 2026-09-18 (fictional).
- Q1 ZZAP 자사주 매입 규모가 얼마인가요?

Answer: 제공된 정보에 자사주 매입 규모가 명시되어 있지 않습니다. 다만 ZZAP은 자사주 매입 프로그램을 시행하고 있다는 정보가 있습니다. 자사주 매입 프로그램의 구체적인 규모를 파악하기 위해서는 추가적인 정보가 필요합니다. /

Items:
- `e658:0` I: 제공된 정보에 자사주 매입 규모가 명시되어 있지 않습니다.
- `e658:1` I: 다만 ZZAP은 자사주 매입 프로그램을 시행하고 있다는 정보가 있습니다.
- `e658:2` I: 자사주 매입 프로그램의 구체적인 규모를 파악하기 위해서는 추가적인 정보가 필요합니다.

## e033

Facts:
- H1 Holding: 비트코인 (BTC), Bitcoin.
- H2 Quantity held: 0.25 BTC.
- H3 Average purchase price: 95,000,000 KRW.
- D1 Latest price (2026-09-25): 91,250,000 KRW.
- D2 Unrealised change vs. average purchase price: -3.95%.
- D3 Position value at the latest price: 22,812,500 KRW.
- M1 Bitcoin fell 4.1% over the last 7 days.
- M2 The 30-day high was 98,400,000 KRW on 2026-09-02.
- N1 A large exchange reported a temporary withdrawal halt on 2026-09-23 (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 현재 비트코인 보유량은 0.25 BTC이며, 평균 매수 가격은 9억 5천만 원입니다. 최신 가격은 9억 1천 2백만 원으로, 평균 매수 가격 대비 3.95% 하락했습니다. 최근 7일 동안 비트코인은 4.1% 하락했으며, 30일 최고가는 9억 8천 4백만 원이었습니다. /

Items:
- `e033:0` 0.25 BTC
- `e033:1` 9억 5천만 원
- `e033:2` 9억 1천 2백만 원
- `e033:3` 3.95%
- `e033:4` 4.1%
- `e033:5` 30
- `e033:6` 9억 8천 4백만 원

## e392

Facts:
- H1 Holding: Zeta S&P 500 Test ETF Trust (ZZSP), US listing.
- H2 Quantity held: 2.5 shares.
- H3 Average purchase price: 480.00 USD.
- D1 Latest price (2026-09-25): 512.30 USD.
- D2 Unrealised change vs. average purchase price: +6.73%.
- D3 Position value at the latest price: 1,280.75 USD.
- M1 The ETF rose 1.8% over the last 20 sessions.
- M2 The ETF is 2.1% below its all-time high of 523.30 USD.
- N1 Index constituents reported mixed third-quarter guidance (fictional).
- Q1 ZZSP는 계속 보유해도 되나요?

Answer: 현재 ZZSP 보유량은 2.5주이며, 평균 매입 가격은 480.00 USD 입니다. 최신 가격은 512.30 USD로, 평균 매입 가격 대비 6.73%의 이익을 보고 있습니다. 최근 20거래일 동안 ETF는 1.8% 상승했으며, 모든 시간 최고가에서 2.1% 낮습니다. /

Items:
- `e392:0` 2.5주
- `e392:1` 480.00 USD
- `e392:2` 512.30 USD
- `e392:3` 6.73%
- `e392:4` 20
- `e392:5` 1.8%
- `e392:6` 2.1%

## e359

Facts:
- H1 Holding: 비트코인 (BTC), Bitcoin.
- H2 Quantity held: 0.25 BTC.
- H3 Average purchase price: 95,000,000 KRW.
- D1 Latest price (2026-09-25): 91,250,000 KRW.
- D2 Unrealised change vs. average purchase price: -3.95%.
- D3 Position value at the latest price: 22,812,500 KRW.
- M1 Bitcoin fell 4.1% over the last 7 days.
- M2 The 30-day high was 98,400,000 KRW on 2026-09-02.
- N1 A large exchange reported a temporary withdrawal halt on 2026-09-23 (fictional).
- Q1 비트코인이랑 금현물 비교해 주세요.

Answer: 현재 비트코인 잔고는 0.25 BTC이며, 평균 매수 가격은 95억 원입니다. 최신 가격은 91억 2천 5백만 원으로, 평균 매수 가격 대비 3.95%의 unrealized 손실이 발생했습니다. 금현물과의 비교에 대한 정보는 현재 제공된 사실에 포함되어 있지 않습니다. /

Items:
- `e359:0` 0.25 BTC
- `e359:1` 95억 원
- `e359:2` 91억 2천 5백만 원
- `e359:3` 3.95%

## e419

Facts:
- H1 Holding: KRX 금현물 (KRX-GOLD), KRX gold spot.
- H2 Quantity held: 50 g.
- H3 Average purchase price: 132,000 KRW per g.
- D1 Latest price (2026-09-25): 148,500 KRW.
- D2 Unrealised change vs. average purchase price: +12.50%.
- D3 Position value at the latest price: 7,425,000 KRW.
- M1 KRX gold spot rose 2.3% over the last 30 days.
- M2 Daily trading volume averaged 310 kg over the last 20 sessions.
- N1 Central bank gold purchases were reported to continue in the third quarter (fictional).
- Q1 비트코인이랑 금현물 비교해 주세요.

Answer: KRX 금현물 50g을 132,000 KRW에 매수하여 현재 148,500 KRW에 보유하고 있으며, 현재 가치는 7,425,000 KRW 입니다. 지난 30일 동안 KRX 금 시세는 2.3% 상승했으며, 최근 20 거래일 동안 일평균 거래량은 310kg입니다. 중앙은행의 금 구매가 3분기에도 지속될 것이라는 소식이 있습니다. /

Items:
- `e419:0` 50g
- `e419:1` 132,000 KRW
- `e419:2` 148,500 KRW
- `e419:3` 7,425,000 KRW
- `e419:4` 30
- `e419:5` 2.3%
- `e419:6` 20
- `e419:7` 310kg
- `e419:8` I: 중앙은행의 금 구매가 3분기에도 지속될 것이라는 소식이 있습니다.

## e478

Facts:
- H1 Holding: 비트코인 (BTC), Bitcoin.
- H2 Quantity held: 0.25 BTC.
- H3 Average purchase price: 95,000,000 KRW.
- D1 Latest price (2026-09-25): 91,250,000 KRW.
- D2 Unrealised change vs. average purchase price: -3.95%.
- D3 Position value at the latest price: 22,812,500 KRW.
- M1 Bitcoin fell 4.1% over the last 7 days.
- M2 The 30-day high was 98,400,000 KRW on 2026-09-02.
- N1 A large exchange reported a temporary withdrawal halt on 2026-09-23 (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 현재 포트폴리오는 비트코인 {H1} 0.25개 0.25 BTC를 보유하고 있으며, 평균 매수 가격은 9,500만 원입니다. 최근 7일 동안 비트코인 가격은 4.1% 하락했지만, 현재 포지션 가치는 2,281만 2,500원입니다. 비트코인 가격 변동 및 특정 거래소의 일시적인 철수 중단과 같은 뉴스에 대한 지속적인 모니터링이 필요합니다. /

Items:
- `e478:0` 0.25
- `e478:1` 0.25 BTC
- `e478:2` 9,500만 원
- `e478:3` 4.1%
- `e478:4` 2,281만 2,500원
- `e478:5` I: 비트코인 가격 변동 및 특정 거래소의 일시적인 철수 중단과 같은 뉴스에 대한 지속적인 모니터링이 필요합니다.

## e391

Facts:
- H1 Holding: Zeta Apple Test Inc. (ZZAP), US listing.
- H2 Quantity held: 12 shares.
- H3 Average purchase price: 201.00 USD.
- D1 Latest price (2026-09-25): 188.40 USD.
- D2 Unrealised change vs. average purchase price: -6.27%.
- D3 Position value at the latest price: 2,260.80 USD.
- M1 The share price fell 6.5% over the last 20 sessions.
- M2 The stock trades at 24.3 times trailing earnings.
- N1 The company announced a 15,000,000,000 USD share buyback on 2026-09-18 (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 현재 포트폴리오 점검을 요청하셨습니다. 보유 주식은 Zeta Apple Test Inc. (12주) 12주이며, 평균 매입 가격은 201.00달러였습니다. 최신 주가인 188.40달러는 -6.27%만큼 변동되었으며, 최근 20 동안 6.5%만큼 하락했습니다. /

Items:
- `e391:0` 12주
- `e391:1` 12주
- `e391:2` 201.00달러
- `e391:3` 188.40달러
- `e391:4` 6.27%
- `e391:5` 20
- `e391:6` 6.5%

## e401

Facts:
- H1 Holding: KRX 금현물 (KRX-GOLD), KRX gold spot.
- H2 Quantity held: 50 g.
- H3 Average purchase price: 132,000 KRW per g.
- D1 Latest price (2026-09-25): 148,500 KRW.
- D2 Unrealised change vs. average purchase price: +12.50%.
- D3 Position value at the latest price: 7,425,000 KRW.
- M1 KRX gold spot rose 2.3% over the last 30 days.
- M2 Daily trading volume averaged 310 kg over the last 20 sessions.
- N1 Central bank gold purchases were reported to continue in the third quarter (fictional).
- Q1 금현물 수익률은 어떤가요?

Answer: 현재 금현물 수익률은 평균 매입 가격인 13만 2,000원 132,000 KRW 대비 실현된 수익률이 +12.50% +12.50%입니다. 지난 30일 동안 금현물 가격은 2.3% 2.3% 상승했습니다. 제시된 정보만으로는 정확한 수익률을 판단하기 어렵습니다.

Items:
- `e401:0` 13만 2,000원
- `e401:1` 132,000 KRW
- `e401:2` 12.50%
- `e401:3` 12.50%
- `e401:4` 30
- `e401:5` 2.3%
- `e401:6` 2.3%

## e258

Facts:
- H1 Holding: 삼성테스트전자 (900001), Korean listing.
- H2 Quantity held: 10 shares.
- H3 Average purchase price: 71,000 KRW.
- D1 Latest price (2026-09-25): 65,320 KRW.
- D2 Unrealised change vs. average purchase price: -8.00%.
- D3 Position value at the latest price: 653,200 KRW.
- M1 The share price fell 11.2% over the last 20 sessions.
- M2 The price is below its 50-day moving average of 69,800 KRW.
- M3 The 52-week low is 61,500 KRW.
- N1 The company guided third-quarter operating profit 18% below the prior quarter (fictional).
- Q1 삼성테스트전자 52주 최저가 근처인가요?

Answer: 삼성테스트전자 주가는 현재 65,320 KRW (65만 3,200원)이며, 52주 최저가 61,500 KRW (6만 1,500원)과 가까울 수 있습니다. 최근 20일 동안 주가가 11.2% 하락했습니다 (11.2%). 하지만 현재 주가는 50일 이동평균선 69,800 KRW (6만 9,800원) 아래에 위치하고 있습니다 (50).

Items:
- `e258:0` 65,320 KRW
- `e258:1` 65만 3,200원
- `e258:2` 52주
- `e258:3` 61,500 KRW
- `e258:4` 6만 1,500원
- `e258:5` 20
- `e258:6` 11.2%
- `e258:7` 11.2%
- `e258:8` 50
- `e258:9` 69,800 KRW
- `e258:10` 6만 9,800원
- `e258:11` 50

## e483

Facts:
- H1 Holding: Zeta Apple Test Inc. (ZZAP), US listing.
- H2 Quantity held: 12 shares.
- H3 Average purchase price: 201.00 USD.
- D1 Latest price (2026-09-25): 188.40 USD.
- D2 Unrealised change vs. average purchase price: -6.27%.
- D3 Position value at the latest price: 2,260.80 USD.
- M1 The share price fell 6.5% over the last 20 sessions.
- M2 The stock trades at 24.3 times trailing earnings.
- N1 The company announced a 15,000,000,000 USD share buyback on 2026-09-18 (fictional).
- Q1 전체 포트폴리오 점검해 주세요.

Answer: 제타 애플 테스트 주식 포트폴리오를 점검하면 현재 12주를 보유하고 있으며 평균 매입 가격은 201.00달러 USD입니다. 최신 주가인 188.40달러 USD는 평균 매입 가격보다 -6.27%의 unrealised 손실을 보이고 있으며, 20개 거래일 동안 주가가 20 하락했습니다. 또한, 최근 15,000,000,000.00달러 USD 규모의 주식 매입 계획이 발표되었지만, 포트폴리오 전체에 대한 정보는 제공되지 않았습니다.

Items:
- `e483:0` 12주
- `e483:1` 201.00달러
- `e483:2` 188.40달러
- `e483:3` 6.27%
- `e483:4` 20
- `e483:5` 20
- `e483:6` 15,000,000,000.00달러
- `e483:7` I: 또한, 최근 15,000,000,000.00달러 USD 규모의 주식 매입 계획이 발표되었지만, 포트폴리오 전체에 대한 정보는 제공되지 않았습니다.
