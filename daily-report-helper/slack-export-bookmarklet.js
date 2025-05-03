(async () => {
  const DEBUG_MODE = false;
  const log = (value) => {
    if (DEBUG_MODE === true) {
      console.log(value);
    }
  };

  /**
   * Gather Slack messages in all page of search result.
   * @param messagePack
   */
  const getMessageInner = async (messagePack) => {
    log(">>> getMessageInner");
    if (!messagePack.hasNextPage) {
      log("messagePack.hasNextPage = " + messagePack.hasNextPage);
      return;
    }

    /* Wait searched results and gather these messages */
    await createPromiseWaitSearchResult();
    do {
      await wait(800);
      await createPromiseGetMessages(messagePack);
    } while (messagePack.pushed === true);
    await createPromiseClickNextButton(messagePack);
    await wait(600);
    await createPromiseCheckOutOfPageLimit(messagePack);
    await getMessageInner(messagePack);
  };

  const getMessage = async (messagePack) => {
    log(">>> getMessage");
    await getMessageInner(messagePack);
  };

  /**
   * Wait display searched result.
   */
  const createPromiseWaitSearchResult = () => {
    log(">>> createPromiseWaitSearchResult");
    const selector = ".c-search_message__content";
    const messageGroupSelector = ".c-message_group";
    const messageTimestampSelector = ".c-timestamp";
    const messageTimestampAttributeKey = "data-ts";

    const observeFunc = () => {
      let messageGroups = document.querySelectorAll(messageGroupSelector);
      let completed = true;
      messageGroups.forEach((messageGroup) => {
        let timestampElm = messageGroup.querySelector(messageTimestampSelector);
        if (!timestampElm) {
          completed = false;
          return;
        }
        let timestampAttributeValue = timestampElm.getAttribute(
          messageTimestampAttributeKey,
        );
        if (!timestampAttributeValue) {
          completed = false;
        }
      });

      const el = document.querySelector(selector);
      if (el && completed) {
        return el;
      }
      return null;
    };

    return new Promise((resolve) => {
      let observedElement = observeFunc();
      if (observedElement !== null) {
        resolve(observedElement);
      }

      new MutationObserver((mutationRecords, observer) => {
        let observedElement = observeFunc();
        if (observedElement !== null) {
          resolve(observedElement);
          /* Once we have resolved we don't need the observer anymore */
          observer.disconnect();
        }
      })
        .observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
    });
  };

  /**
   * Get message
   */
  const createPromiseGetMessages = async (messagePack) => {
    log(">>> createPromiseGetMessages");
    const messageGroupSelector = ".c-message_group";
    const messageExpandSelector =
      ":where(.c-search__expand, .c-rich_text_expand_button)";
    const messageContentSelector =
      ".c-search_message__content > .c-message__message_blocks";
    const messageAttachmentSelector =
      ".c-search_message__content > :where(.c-message_attachment, .c-message_attachment_v2)";
    const messageTimestampSelector = ".c-timestamp";
    const messageTimestampAttributeKey = "data-ts";
    const channelNameSelector = ".c-message_group__header";
    const messageSenderSelector = ".c-message__sender_button";
    const timestampLabelSelector = ".c-timestamp__label";

    messagePack.pushed = false;
    let messageGroups = document.querySelectorAll(messageGroupSelector);
    log(
      "createPromiseGetMessages | Promise | messageGroups.length = " +
        messageGroups.length,
    );

    for await (const messageGroup of messageGroups) {
      let expands;
      for (let i = 0; i < 20; i++) {
        expands = messageGroup.querySelectorAll(messageExpandSelector);
        log(
          "createPromiseGetMessages | Promise | messageGroups.forEach | expands.length = " +
            expands.length,
        );

        expands.forEach((expand) => {
          expand.click();
        });

        if (expands.length === 0) {
          break;
        }

        await wait(100);
      }

      if (expands.length !== 0) {
        messagePack.pushed = true; /* retry in case of dom recreation */
        return;
      }

      const datetime = timestampToTime(
        messageGroup.querySelector(messageTimestampSelector).getAttribute(
          messageTimestampAttributeKey,
        ).split(".")[0],
      );
      /* qiita_twitter_bot */
      const channelName =
        messageGroup.querySelector(channelNameSelector).textContent;
      /* twitter */
      const sender =
        messageGroup.querySelector(messageSenderSelector).textContent;
      /* 8:00 PM */
      const timestampLabel =
        messageGroup.querySelector(timestampLabelSelector).textContent;
      /* twitterAPP 8:00 PM slack message here ...  */
      const content = messageGroup.querySelector(messageContentSelector)
        ?.textContent.replace(/ （編集済み） /g, "") ?? "";
      const attachments =
        [...messageGroup.querySelectorAll(messageAttachmentSelector)].map((
          m,
        ) => `<aside>${m.textContent}</aside>`).join("\n") ??
          "";
      const message = `${content}\n${attachments}`;

      const row = [
        datetime,
        channelName,
        sender,
        message,
      ];

      /* 2020/12/19 20:00:20 <> qiita_twitter_bot <> twitter <> slack message here ...  */
      const timeAndMessage = row.join(",");

      if (messagePack.set.has(timeAndMessage)) {
        continue;
      }

      log(
        "createPromiseGetMessages | Promise | messageGroups.forEach | " +
          timeAndMessage,
      );

      messagePack.set.add(timeAndMessage);
      messagePack.pushed = true;
      messagePack.values.push(row);

      messageGroup.scrollIntoView();
    }
  };

  /**
   * Click next page link
   */
  const createPromiseClickNextButton = (messagePack) => {
    log(">>> createPromiseClickNextButton");

    const arrowBtnElements = document.querySelectorAll(
      ".c-pagination__arrow_btn",
    );
    let nextArrowBtnElement = null;
    messagePack.hasNextPage = false;
    if (arrowBtnElements.length === 0) {
      /* Return dummy promise */
      return Promise.resolve(messagePack);
    }
    arrowBtnElements.forEach((e) => {
      if (["Next page", "次のページ"].includes(e.getAttribute("aria-label"))) {
        nextArrowBtnElement = e;
      }
    });
    if (!nextArrowBtnElement) {
      log("createPromiseClickNextButton | Next page button not found.");
      return Promise.resolve(messagePack);
    }
    messagePack.hasNextPage =
      nextArrowBtnElement.attributes["aria-disabled"].value === "false";
    if (!messagePack.hasNextPage) {
      log(
        "createPromiseClickNextButton | messagePack.hasNextPage = " +
          messagePack.hasNextPage,
      );
      /* Return dummy promise */
      return Promise.resolve(messagePack);
    }
    return new Promise((resolve) => {
      log("createPromiseClickNextButton | Promise | click()");
      nextArrowBtnElement.click();
      resolve(messagePack);
    });
  };

  /**
   * Check if the next page is out of the page limit
   */
  const createPromiseCheckOutOfPageLimit = (messagePack) => {
    log(">>> createPromiseCheckOutOfPageLimit");
    const selector = ".c-search_message__content";
    let el = document.querySelector(selector);
    if (el === null) {
      messagePack.hasNextPage = false;
    }
    return Promise.resolve(messagePack);
  };

  /**
   * Wait specified millisecond
   */
  const wait = (millisecond) => {
    return new Promise((resolve) => setTimeout(resolve, millisecond));
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
   * Escape regex meta characters
   * > Escape string for use in Javascript regex - Stack Overflow
   * > https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
   * @param stringValue
   * @returns {*}
   */
  const escapeRegExp = (stringValue) => {
    /* $& means the whole matched string */
    return stringValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  /**
   * Download list as a file
   * @param messagePack
   * @returns {boolean}
   */
  const download = (messagePack) => {
    log(">>> download");
    const massageAll = "datetime,channelName,sender,trimmedMessage,\n" +
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
  };

  const exportMessage = async () => {
    log(">>> exportMessage");
    const messagePack = {
      values: [],
      set: new Set(),
      pushed: false,
      hasNextPage: true, /* To handle a first loop */
    };

    /* Gather messages in all pages */
    await getMessage(messagePack);

    download(messagePack);
  };

  /* Run */
  await exportMessage();
})();
