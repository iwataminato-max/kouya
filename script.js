(function() {
  const chargePacks = [
    { name: "毎週1回限りお得パック", price: 10000, paid: 5000, total: 6280, weeklyLimit: 1 },
    { name: "160円パック", price: 160, paid: 80, total: 85, weeklyLimit: 99 },
    { name: "480円パック", price: 480, paid: 240, total: 252, weeklyLimit: 99 },
    { name: "800円パック", price: 800, paid: 400, total: 431, weeklyLimit: 99 },
    { name: "1,500円パック", price: 1500, paid: 750, total: 820, weeklyLimit: 99 },
    { name: "2,400円パック", price: 2400, paid: 1200, total: 1325, weeklyLimit: 99 },
    { name: "3,800円パック", price: 3800, paid: 1900, total: 2103, weeklyLimit: 99 },
    { name: "5,000円パック", price: 5000, paid: 2500, total: 2840, weeklyLimit: 99 },
    { name: "10,000円パック", price: 10000, paid: 5000, total: 5780, weeklyLimit: 99 },
    { name: "30,000円パック", price: 30000, paid: 15000, total: 17340, weeklyLimit: 99 },
    { name: "50,000円パック", price: 50000, paid: 25000, total: 28900, weeklyLimit: 99 },
    { name: "100,000円パック", price: 100000, paid: 50000, total: 57800, weeklyLimit: 99 }
  ];

  function getVal(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    if (el.tagName === "SELECT" || el.tagName === "INPUT") return el.value;
    const inner = el.querySelector("select, input");
    return inner ? inner.value : (el.textContent || "");
  }

  function getNum(id) {
    const val = String(getVal(id)).replace(/,/g, "");
    const match = val.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  function parseKangen(id) {
    const val = String(getVal(id)).replace(/,/g, "");
    const nums = val.match(/\d+/g);
    if (!nums || nums.length < 2) return [0, 0];
    return [parseInt(nums[0], 10), parseInt(nums[1], 10)];
  }

  function parseStartDate(id) {
    const raw = String(getVal(id)).trim();
    if (!raw) return new Date();
    const clean = raw.replace(/[^0-9]/g, "");
    if (clean.length === 8) {
      const y = parseInt(clean.slice(0, 4), 10);
      const m = parseInt(clean.slice(4, 6), 10) - 1;
      const d = parseInt(clean.slice(6, 8), 10);
      return new Date(y, m, d);
    }
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function calcMinCharge(targetPaid) {
    if (targetPaid <= 0) return { price: 0, totalVouchers: 0, breakdown: [] };
    const maxCalc = targetPaid + 5000;
    const dp = new Array(maxCalc).fill(Infinity);
    const choice = new Array(maxCalc).fill(-1);
    const weekPackUsed = new Array(maxCalc).fill(false);
    dp[0] = 0;

    for (let i = 0; i < dp.length; i++) {
      if (dp[i] === Infinity) continue;
      chargePacks.forEach((p, idx) => {
        if (idx === 0 && weekPackUsed[i]) return;
        const next = i + p.paid;
        if (next < dp.length && dp[i] + p.price < dp[next]) {
          dp[next] = dp[i] + p.price;
          choice[next] = idx;
          weekPackUsed[next] = weekPackUsed[i] || (idx === 0);
        }
      });
    }

    let minCost = Infinity, bestPaid = targetPaid;
    for (let k = targetPaid; k < dp.length; k++) {
      if (dp[k] < minCost) { minCost = dp[k]; bestPaid = k; }
    }

    const counts = new Array(chargePacks.length).fill(0);
    let curr = bestPaid, gotTotal = 0;
    while (curr > 0 && choice[curr] !== -1) {
      const idx = choice[curr];
      counts[idx]++;
      gotTotal += chargePacks[idx].total;
      curr -= chargePacks[idx].paid;
    }

    const breakdown = [];
    counts.forEach((c, idx) => {
      if (c > 0) breakdown.push(`${chargePacks[idx].name}×${c}`);
    });
    return { price: minCost, totalVouchers: gotTotal, breakdown: breakdown };
  }

  function formatDate(d) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
  }

  function buildSchedule(targetTickets, startDate, cond1, t1, days1, cond2, t2, days2, limitedPacks, valuePriority) {
    const schedule = [];
    const currDate = new Date(startDate);
    let accTickets = 0;
    let totalPrice = 0;

    for (let i = 0; i < days1; i++) {
      const r = calcMinCharge(cond1);
      const got = t1 + Math.floor(r.totalVouchers / 100);
      accTickets += got;
      totalPrice += r.price;
      schedule.push({
        date: formatDate(currDate),
        dayOfWeek: currDate.getDay(),
        desc: `チャージ (${cond1}有償金券達成) [${r.breakdown.join(', ')}]`,
        tickets: got,
        price: r.price
      });
      currDate.setDate(currDate.getDate() + 1);
    }

    for (let i = 0; i < days2; i++) {
      const r = calcMinCharge(cond2);
      const got = t2 + Math.floor(r.totalVouchers / 100);
      accTickets += got;
      totalPrice += r.price;
      schedule.push({
        date: formatDate(currDate),
        dayOfWeek: currDate.getDay(),
        desc: `チャージ (${cond2}有償金券達成) [${r.breakdown.join(', ')}]`,
        tickets: got,
        price: r.price
      });
      currDate.setDate(currDate.getDate() + 1);
    }

    if (accTickets < targetTickets) {
      limitedPacks.forEach(p => {
        let buyCount = 0;
        if (valuePriority && p.tickets >= 50) {
          while (accTickets < targetTickets && buyCount < p.remain) {
            buyCount++; accTickets += p.tickets; totalPrice += p.price;
          }
        } else {
          if (accTickets < targetTickets && buyCount < p.remain) {
            buyCount = 1; accTickets += p.tickets; totalPrice += p.price;
          }
        }
        if (buyCount > 0 && schedule.length > 0) {
          schedule[0].desc += ` ＋ ${p.name}×${buyCount}`;
          schedule[0].tickets += p.tickets * buyCount;
          schedule[0].price += p.price * buyCount;
        } else if (buyCount > 0) {
          schedule.push({
            date: formatDate(currDate),
            dayOfWeek: currDate.getDay(),
            desc: `${p.name}×${buyCount}`,
            tickets: p.tickets * buyCount,
            price: p.price * buyCount
          });
        }
      });
    }

    if (accTickets < targetTickets) {
      const shortTickets = targetTickets - accTickets;
      const r = calcMinCharge(shortTickets * 100);
      const got = Math.floor(r.totalVouchers / 100);
      accTickets += got;
      totalPrice += r.price;

      if (schedule.length > 0) {
        schedule[0].desc += ` ＋ 追加金券チャージ [${r.breakdown.join(', ')}]`;
        schedule[0].tickets += got;
        schedule[0].price += r.price;
      } else {
        schedule.push({
          date: formatDate(currDate),
          dayOfWeek: currDate.getDay(),
          desc: `追加金券チャージ [${r.breakdown.join(', ')}]`,
          tickets: got,
          price: r.price
        });
      }
    }

    let sundayGranted = false;
    schedule.forEach(d => {
      if (!sundayGranted && (d.dayOfWeek >= 0 && d.dayOfWeek <= 6)) {
        if (d.dayOfWeek === 0 || d.tickets >= 80 || accTickets >= 80) {
          d.desc += ` (日曜日まで100連達成+8枚)`;
          d.tickets += 8;
          sundayGranted = true;
        }
      }
      if (d.dayOfWeek === 1) {
        d.desc += ` (月曜100連リセット+8枚)`;
        d.tickets += 8;
      }
    });

    return { schedule: schedule, totalTickets: accTickets, totalPrice: totalPrice };
  }

  function outputSeparated(prefix, data) {
    for (let i = 1; i <= 8; i++) {
      const el = document.getElementById(`${prefix}-day${i}`);
      if (el) {
        const scheduleIndex = i - 1;
        if (data.schedule[scheduleIndex]) {
          const row = data.schedule[scheduleIndex];
          el.textContent = `${i}日目 (${row.date})：${row.desc} ／ +${row.tickets}枚 ／ ${row.price.toLocaleString()}円`;
          el.style.display = "";
        } else {
          el.textContent = "";
          el.style.display = "none";
        }
      }
    }

    const totalEl = document.getElementById(`${prefix}-total`);
    if (totalEl) {
      totalEl.textContent = `合計獲得: ${data.totalTickets}枚 / 合計金額: ${data.totalPrice.toLocaleString()}円`;
    }
  }

  function executeCalc() {
    const dendoType = String(getVal("hoshidendo"));
    const timing = String(getVal("hikutaimingu"));
    const startDate = parseStartDate("kaishibi");

    const vouchers = getNum("kinken");
    const exPt = getNum("expoint");
    const normalPt = getNum("tuuzyoupoint");
    const exTickets = getNum("exchiketto");
    const normalTickets = getNum("tuuzyouchiketto");

    const limitedPacks = [
      { name: "限定殿堂パック 3枚", price: 100, tickets: 3, remain: getNum("pack3") },
      { name: "限定殿堂パック 10枚", price: 1000, tickets: 10, remain: getNum("pack10") },
      { name: "限定殿堂パック 50枚", price: 8300, tickets: 50, remain: getNum("pack50") },
      { name: "限定殿堂パック 90枚", price: 14800, tickets: 90, remain: getNum("pack90") }
    ];

    const needCrystals = dendoType.includes("車") ? 4 : 3;
    const targetPt = needCrystals * 251;
    const currentPt = (exPt * 1.25) + normalPt;
    const remainPt = Math.max(0, targetPt - currentPt);

    const isFirstWeek = timing.includes("初週") && !timing.includes("以外");
    const rate = isFirstWeek ? 8 : 10;

    const heldTickets = exTickets + normalTickets + Math.floor(vouchers / 100);
    const needTickets = Math.max(0, Math.ceil(remainPt / 2.5) * (rate / 10) - heldTickets);

    const [cond1, t1] = parseKangen("kangen-1");
    const days1 = getNum("nissuu-1");
    const [cond2, t2] = parseKangen("kangen-2");
    const days2 = getNum("nissuu-2");

    const plan1 = buildSchedule(needTickets, startDate, cond1, t1, days1, cond2, t2, days2, limitedPacks, false);
    const plan2 = buildSchedule(needTickets, startDate, cond1, t1, days1, cond2, t2, days2, limitedPacks, true);

    outputSeparated("min", plan1);
    outputSeparated("best", plan2);
  }

  function setupButtons() {
    let boundCount = 0;
    ['calc-btn1', 'calc-btn2'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.onclick = executeCalc;
        boundCount++;
      }
    });

    if (boundCount === 0) {
      setTimeout(setupButtons, 500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupButtons);
  } else {
    setupButtons();
  }
})();
