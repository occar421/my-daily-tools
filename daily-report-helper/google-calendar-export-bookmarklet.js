(async () => {
  const log = (value) => {
    if (globalThis.DEBUG_MODE === true) {
      console.log(value);
    }
  };

  const GOOGLE_CALENDAR_URL_PATTERN =
    /^https:\/\/calendar\.google\.com\/calendar\/u\/\d\/r\/([a-z]+)/;

  /* Note: Skipping Task, all-day schedule, silent mode, and absence */
  const getMessage = async () => {
    log(">>> getMessage");

    const match = window.location.href.match(GOOGLE_CALENDAR_URL_PATTERN);
    if (!match) {
      return Promise.reject(
        "This bookmarklet only works on Google Calendar pages.",
      );
    }

    const viewType = match[1];

    switch (viewType) {
      case "month":
        return await getMessageInMonth();
      case "week":
        return await getMessageInWeek();
      default:
        return Promise.reject(`"${viewType}" is not supported.`);
    }
  };

  const STATUS_MAP = new Map([
    ["承諾", "accepted"],
    ["辞退", "declined"],
    ["未定", "tentative"],
    ["出欠確認が必要", "rsvp"],
  ]);

  const getMessageInMonth = async () => {
    log(">>> getMessageInMonth");

    const calendarCellEventsSelector = ".qLWd9c [data-eventchip]";
    const datePopoverButtonSelector = "[data-opens-day-overview=true]";
    const popoverEventsSelector = ".uW2Fw-P5QLlc .N8ryne [data-eventchip]";
    const scheduleSelector = ".XuJrye";

    const eventMap = new Map();

    /* get events from calendar cells */
    const calendarCellEvents = document.querySelectorAll(
      calendarCellEventsSelector,
    );
    for (const event of calendarCellEvents) {
      const id = event.dataset.eventid;
      const schedule = event.querySelector(scheduleSelector);
      eventMap.set(id, schedule.textContent);
    }

    /* get events from popover */
    const datePopoverButtons = document.querySelectorAll(
      datePopoverButtonSelector,
    );
    for (const datePopoverButton of datePopoverButtons) {
      datePopoverButton.click();
      await wait(100);

      const events = document.querySelectorAll(popoverEventsSelector);
      for (const event of events) {
        const id = event.dataset.eventid;
        const schedule = event.querySelector(scheduleSelector);
        eventMap.set(id, schedule.textContent);
      }
    }

    return parseEvents(eventMap);
  };

  const getMessageInWeek = async () => {
    log(">>> getMessageInWeek");

    const dateSelector = ".BiKU4b[data-datekey] [data-eventchip]";
    const scheduleSelector = ".XuJrye";

    const eventMap = new Map();

    const events = document.querySelectorAll(dateSelector);
    for (const event of events) {
      const id = event.dataset.eventid;
      const schedule = event.querySelector(scheduleSelector);
      eventMap.set(id, schedule.textContent);
    }

    return parseEvents(eventMap);
  };

  const parseEvents = (eventMap) => {
    const parsedEvents = eventMap.values().map((schedule) =>
      parseScheduleText(schedule)
    )
      .filter(Boolean).toArray();

    parsedEvents.sort((a, b) =>
      a.startDatetime.getTime() - b.startDatetime.getTime()
    );

    return parsedEvents;
  };

  const parseScheduleText = (str) => {
    log(">>> parseScheduleText " + str);

    const elements = str.split("、");

    if (
      elements.at(0) === "終日" || elements.at(0) === "タスク" ||
      elements.at(0).startsWith("タスク:") || elements.at(0).endsWith("保留中のタスク")
    ) {
      return;
    }

    if (
      elements.at(1).startsWith("不在") ||
      elements.at(1).startsWith("サイレント モード:")
    ) {
      return;
    }

    const date = parseJapaneseDate(elements.at(-1));

    const [start, end] = elements.at(0).split("～");
    const startDatetime = addTime(date, start);
    const endDatetime = addTime(date, end);

    const titleString = elements.at(1);
    const titleMatch = titleString.match(/^「(.*)」$/);
    const title = titleMatch?.[1] ?? titleString;

    const calendarName = elements.at(2);

    const status = STATUS_MAP.get(elements.at(3));

    const locationString = elements.at(4);
    const locationMatch = locationString.match(/^場所: (.+)$/);
    const location = locationMatch?.[1] ??
      (locationString === "場所の指定なし" ? "" : null);

    const result = {
      startDatetime,
      endDatetime,
      type: "schedule",
      title,
      calendarName,
      status,
      location,
    };

    log(">>> parseScheduleText " + JSON.stringify(result));

    return result;
  };

  /**
   * Wait specified millisecond
   */
  const wait = (millisecond) => {
    return new Promise((resolve) => setTimeout(resolve, millisecond));
  };

  /**
   * Parse Japanese date format (e.g., "2025年 4月 3日") into a Date object
   */
  const parseJapaneseDate = (dateStr) => {
    const match = dateStr.match(/(\d+)年\s*(\d+)月\s*(\d+)日/);
    if (!match) return null;
    return new Date(
      parseInt(match[1]),
      parseInt(match[2]) - 1,
      parseInt(match[3]),
    );
  };

  const addTime = (date, timeStr) => {
    const clonedDate = new Date(date);

    const { hours, minutes } = parseTime(timeStr);
    clonedDate.setHours(hours);
    clonedDate.setMinutes(minutes);
    return clonedDate;
  };

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return { hours, minutes };
  };

  /**
   * Download list as a file
   */
  const download = (messages) => {
    log(">>> download");

    const massageAll =
      "startDatetime,endDatetime,type,title,calendarName,status,location\n" +
      messages.map((row) =>
        [
          row.startDatetime.toISOString(),
          row.endDatetime.toISOString(),
          row.type,
          row.title,
          row.calendarName,
          row.status ?? "unknown",
          row.location !== null ? row.location : "unknown",
        ].map((field) => `"${field.replace(/"/g, '""')}"`).join(",")
      ).join("\n");
    log("download | messages.length " + messages.length);
    log("download | massageAll.length " + massageAll.length);

    const link = document.createElement("a");
    link.style.display = "none";
    link.href = window.URL.createObjectURL(
      new Blob([massageAll], { type: "text/plain" }),
    );
    link.download = "calendar_events.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  };

  const exportMessage = async () => {
    log(">>> exportMessage");

    const messages = await getMessage();

    download(messages);
  };

  /* Run */
  await exportMessage();
})();
