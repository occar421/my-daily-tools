(async () => {
  const DEBUG_MODE = true;
  const log = (value) => {
    if (DEBUG_MODE === true) {
      console.log(value);
    }
  };

  const GOOGLE_CALENDAR_URL_PATTERN = /^https:\/\/calendar\.google\.com\/calendar\/u\/\d\/r\/(\S+)\/\d+\/\d+\/\d+\/?.*$/;

  /* Note: Skipping Task, all-day schedule, silent mode, and absence */
  const getMessage = async () => {
    log(">>> getMessage");

    const match = window.location.href.match(GOOGLE_CALENDAR_URL_PATTERN);
    if (!match) {
      return Promise.reject("This bookmarklet only works on Google Calendar pages.");
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

  const getMessageInMonth = async () => {
    const datePopoverButtonSelector = "[data-opens-day-overview=true]";
    const popoverSelector = ".uW2Fw-P5QLlc";
    const eventSelector = ".N8ryne [data-eventchip]";
    const scheduleSelector = ".XuJrye";

    const messages = [];

    const datePopoverButtons = document.querySelectorAll(datePopoverButtonSelector);
    for await (const datePopoverButton of datePopoverButtons) {
      datePopoverButton.click();
      await wait(100);

      const popover = document.querySelector(popoverSelector);
      const events = popover.querySelectorAll(eventSelector);
      for await (const event of events) {
        const schedule = event.querySelector(scheduleSelector);
        const elements = schedule.textContent.split("、");

        if (elements.at(0) === "終日" || elements.at(0) === "タスク" || elements.at(0).startsWith("タスク:")) {
          continue;
        }

        if (elements.at(1).startsWith("不在") || elements.at(1).startsWith("サイレント モード:")) {
          continue;
        }

        const date = parseJapaneseDate(elements.at(-1));

        const [start, end] = elements.at(0).split("～");
        const startDatetime = addTime(date, start);
        const endDatetime = addTime(date, end);

        elements.shift();
        elements.pop();
        const result = [startDatetime, endDatetime,...elements];


        messages.push(result);
      }
    }


    return messages;
  };

  const getMessageInWeek = async () => {
    const dateSelector = ".BiKU4b[data-datekey]";

    alert(`"週" is not supported.`);

    return [];
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
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  };

  const addTime = (date, timeStr) => {
    const clonedDate = new Date(date);

    const {hours, minutes} = parseTime(timeStr);
    clonedDate.setHours(hours);
    clonedDate.setMinutes(minutes);
    return clonedDate;
  };

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return {hours, minutes};
  };

  /**
   * timestamp to datetame
   * @param timestamp
   * @returns {string}
   */
  const timestampToTime = (timestamp) => {
    const d = new Date(timestamp * Math.pow(10, 13 - timestamp.length));
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const yyyy = d.getFullYear();
    const mm = ("0" + (d.getMonth() + 1)).slice(-2);
    const dd = ("0" + d.getDate()).slice(-2);
    const hh = ("0" + d.getHours()).slice(-2);
    const mi = ("0" + d.getMinutes()).slice(-2);
    const ss = ("0" + d.getSeconds()).slice(-2);
    const week = weekday[d.getDay()];
    return `${yyyy}-${mm}-${dd} ${week} ${hh}:${mi}:${ss}`;
  };

  /**
   * Download list as a file
   */
  const download = (messages) => {
    log(">>> download");
    console.log(messages);
    /*
    const massageAll = "datetime,channelName,sender,message\n" +
      messagePack.values.map((row) =>
        row.map((field) => `"${field.replace(/"/g, '""')}"`).join(",")
      ).join("\n");
    log(
      "download | messagePack.messages.length " + messagePack.values.length,
    );
    log("download | massageAll.length " + massageAll.length);

    const link = document.createElement("a");
    link.style.display = "none";
    link.href = window.URL.createObjectURL(
      new Blob([massageAll], { type: "text/plain" }),
    );
    link.download = "slack_messages.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
    */
  };

  const exportMessage = async () => {
    log(">>> exportMessage");

    /* Gather messages in all pages */
    const messages = await getMessage();

    download(messages);
  };

  /* Run */
  await exportMessage();
})();
