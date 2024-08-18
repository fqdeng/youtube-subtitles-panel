// ==UserScript==
// @name         Youtube subtitles
// @namespace    http://fqdeng.com
// @version      1.0.4
// @description  show the subtitels like lyrics plane
// @author       fqdeng
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @run-at document-start
// @require      https://cdn.jsdelivr.net/gh/fqdeng/youtube-subtitles-panel@master/jquery.min.fixed.js
// @require      https://cdn.jsdelivr.net/npm/jquery-ui@1.14.0/dist/jquery-ui.min.js
// @require      https://cdn.jsdelivr.net/npm/notify-js-legacy@0.4.1/notify.min.js
// @require      https://cdn.jsdelivr.net/npm/jquery-contextmenu@2.7.1/dist/jquery.contextMenu.min.js
// @require      https://cdn.jsdelivr.net/npm/jquery-contextmenu@2.7.1/dist/jquery.ui.position.min.js
// @require      https://cdn.jsdelivr.net/npm/jquery-modal@0.9.1/jquery.modal.min.js
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/fqdeng/youtube-subtitles-panel/master/main.user.js
// @downloadURL  https://raw.githubusercontent.com/fqdeng/youtube-subtitles-panel/master/main.user.js
// @license MIT
// ==/UserScript==

(function () {

    'use strict';
    GM_registerMenuCommand("configs", function () {
        openTokenSettingsDialog();
    });
    let draggableDiv = null;
    let contentDiv = document.createElement('div');
    let windowDiv = null;
    const textArea = document.createElement('textarea');
    const item = localStorage.getItem("autoScrollEnabled");
    let select = null;
    let autoScrollEnabled = !item || item === 'true'; // Initialize auto-scroll as enabled


    // Function to save position and size to localStorage
    function savePositionAndSize(left, top, width, height) {
        localStorage.setItem('draggableSubtitlesPosition', JSON.stringify({left, top, width, height}));
    }

    // Function to get position and size from localStorage
    function getPositionAndSize() {
        const savedPosition = localStorage.getItem('draggableSubtitlesPosition');
        return savedPosition ? JSON.parse(savedPosition) : {
            left: '859px',
            top: '83px',
            width: '384.891px',
            height: '436px'
        };
    }

    function getVideoIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    function isYouTubeVideoUrl() {
        var url = window.location.href;
        var pattern = /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]+/;
        return pattern.test(url);
    }

    function onPageChanged() {
        console.log('url change');
        if (!isYouTubeVideoUrl()) {
            if (draggableDiv) {
                $(draggableDiv).hide()
            }
        } else {
            if (draggableDiv && !document.fullscreenElement) {
                $(draggableDiv).show()
            }
        }
        loadSubtitles(null);
    }

    function decodeHtmlEntities(text) {
        textArea.innerHTML = text;
        return textArea.value;
    }

    function updateSubtitleScroll(videoTime) {
        const positionAndSize = getPositionAndSize();
        const subtitles = contentDiv.getElementsByTagName('div');
        let position = -1;

        for (let i = 0; i < subtitles.length; i++) {
            const subtitle = subtitles[i];
            const subtitleData = subtitle.dataset;
            const start = parseFloat(subtitleData.start);
            const duration = parseFloat(subtitleData.dur);
            const element = subtitles[i]
            if (videoTime >= start && videoTime <= start + duration) {
                position = i;
                break;
            }
        }

        if (position > 0) {
            for (let i = 0; i < subtitles.length; i++) {
                let element = subtitles[i]
                element.style.backgroundColor = '';
            }
            let element = subtitles[position]
            element.style.backgroundColor = 'orange';
            // subtitles[i].scrollIntoView({behavior: 'smooth', block: 'center'});
            element.parentNode.parentNode.scrollTop = element.offsetTop - (parseInt(positionAndSize.height) / 3);
        }

    }

    let previousCurrentTime = null;

    function setupVideoPlayerListener() {
        setInterval(() => {
            var player = document.getElementsByTagName("video")[0];
            if (player) {
                const currentTime = player.currentTime;
                if (previousCurrentTime === currentTime) {
                    //Do nothing here, cause YouTube video player has been paused
                } else {
                    if (autoScrollEnabled) {
                        previousCurrentTime = currentTime;
                        updateSubtitleScroll(currentTime);
                    }
                }
            }
        }, 500); // Update every half second
    }


    // Function to get the selected text and its containing element
    function getSelectedTextAndElement() {
        // Get the current selection
        let selection = window.getSelection();

        // If there's no selection, return null
        if (!selection.rangeCount) {
            return null;
        }

        // Get the range object that contains the selected text
        let range = selection.getRangeAt(0);

        // Extract the selected text
        let selectedText = selection.toString();

        // Find the common ancestor container of the selected text
        let containingElement = range.startContainer.parentElement;

        console.log("containingElement: ", containingElement)

        // If the selected text is within a text node, move to its parent element
        if (containingElement.nodeType === Node.TEXT_NODE) {
            containingElement = containingElement.parentNode;
        }

        // Return both the selected text and the containing element
        return {
            text: selectedText,
            element: containingElement
        };
    }

    // Function to pause the YouTube video on YouTube.com
    function pauseYouTubeVideo() {
        const video = document.querySelector('video');
        if (video && !video.paused) {
            video.pause();
            console.log("YouTube video paused.");
        }
    }

    // Function to start the YouTube video on YouTube.com
    function getCurrentVideoState() {
        const video = document.querySelector('video');
        if (video) {
            if (video.paused) {
                return "paused"
            }
        }
        return "playing"
    }

    // Function to start the YouTube video on YouTube.com
    function startYouTubeVideo() {
        const video = document.querySelector('video');
        if (video && video.paused) {
            video.play();
            console.log("YouTube video started.");
        }
    }

    function createSaveWordsDialog(start, chosenText) {
        $("#modal").remove();
        console.log("chosen text video start: ", start);

        GM_addStyle(` 
        /* <style> trick */
        .jquery-modal.blocker {
            z-index: 10001 !important;
        }
        .jquery-modal {
            z-index: 10002 !important;
        }
        #modal {
        }
        #chosenText {
            border-top: 1px dashed #ccc;
            border-bottom: 1px dashed #ccc;
            padding: 10px 0;
        }
        .word {
            cursor: pointer;
        }
        #keywordLine {
            margin-top: 10px;
            border: 1px solid #ccc;
            padding: 5px;
            min-height: 30px;
            font-size: 16px;
        }
        .keyword {
            display: inline-block;
            margin-right: 5px;
            margin-bottom: 5px;
            padding: 2px 5px;
            background-color: #ddd;
            border-radius: 3px;
            cursor: pointer;
            font-size: 16px;
        }
        #hashtagSection{
            user-select: none;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 20px;
        }
        input[type="checkbox"][name="hashtag"] {
            display: none;
        }
        .hashtag-label {
            display: inline-block;
            padding: 5px 10px;
            margin-right: 5px;
            border: 1px solid #ccc;
            border-radius: 5px;
            cursor: pointer;
            background-color: #f0f0f0;
        }
        .hashtag-label.selected {
            background-color: #4caf50; 
            color: white;
        }
        #keyword {
            user-select: none;
        }
        `);

        $("body").append(`
            <div id="modal" class="modal" style="min-height: 100px; z-index: 10001;">
                <h1>Double-click or right-click the texts below to choose the phrase or word</h1>
                <p id="chosenText" style="font-size: 16px; margin-top:20px"></p>
                <div id="hashtagSection" style="font-size: 14px; margin-top:20px; "> 
                    <h2 style="padding-bottom: 10px">Hashtag:</h2>
                    <label class="hashtag-label" for="hashtag1">#hashtag1<input type="checkbox" name="hashtag" value="#hashtag1" id="hashtag1"></label>
                    <label class="hashtag-label" for="hashtag2">#hashtag2<input type="checkbox" name="hashtag" value="#hashtag2" id="hashtag2"></label>
                    <label class="hashtag-label" for="hashtag3">#hashtag3<input type="checkbox" name="hashtag" value="#hashtag3" id="hashtag3"></label>
                </div>
                <div id="keyword" style="margin-top:20px; font-size: 14px">
                    <h2>Word or Phrase:</h2>
                    <div id="keywordLine"></div>
                 </div>
                <div style="font-size: 14px; margin-top:20px; display: flex; justify-content: flex-end;"><button id="saveAll">Save</button></div>
            </div>
        `);

        $.contextMenu({
            selector: '#chosenText',
            callback: function (key, options) {
                const m = "clicked: " + key;
                let selectedTextAndElement = getSelectedTextAndElement();
                const text = selectedTextAndElement.text
                console.log('Selected text:' + text);
                if (!text || text.trim().length === 0){
                    return
                }
                modifyKeywords(text);
            },
            items: {
                "save": {
                    name: "Add", icon: 'add'
                },
            },
            events: {}
        });

        function extractWord(text) {
            return text.match(/[\w'-]+/)[0];
        }

        const words = chosenText.split(/[\s\n]+/);
        words.forEach(word => {
            $("#chosenText").append(`<span class="word">${word} </span>`);
        });

        function htmlEncode(value) {
            return $('<div/>').text(value).html();
        }

        function modifyKeywords(cleanWord) {
            const keywordLine = $("#keywordLine");
            const existingKeyword = keywordLine.find(`.keyword[data-word='${htmlEncode(cleanWord)}']`);

            if (existingKeyword.length === 0) {
                keywordLine.append(`<span class="keyword" data-word="${htmlEncode(cleanWord)}">${cleanWord} <span class="removeKeyword" style="cursor: pointer;">&times;</span></span>`);
            } else {
                existingKeyword.remove();
            }
        }

        $(".word").on("dblclick", function (event) {
            event.preventDefault();
            const word = $(this).text().trim();
            const cleanWord = extractWord(word);
            modifyKeywords(cleanWord);
        });

        $("#keywordLine").on("click", ".removeKeyword", function () {
            $(this).parent(".keyword").remove();
        });

        $(".hashtag-label").on("click", function () {
            const checkbox = $(this).find('input[type="checkbox"]');
            const isChecked = checkbox.is(':checked');

            if (isChecked) {
                checkbox.prop('checked', false);
                $(this).removeClass('selected');
            } else {
                checkbox.prop('checked', true);
                $(this).addClass('selected');
            }
        });

        $("#saveAll").on("click", function () {
                console.log("button clicked");
                const keywords = $("#keywordLine .keyword").map(function () {
                    return $(this).data("word");
                }).get();
                const hashtags = $("input[name='hashtag']:checked").map(function () {
                    return $(this).val();
                }).get();
                const data = {
                    keywords,
                    hashtags,
                    start
                };
                console.log("Save data: ", data);

                $.notify("Saving..", {
                    className: 'success',
                    autoHideDelay: 3000,
                    position: "right bottom",
                });

                $.modal.close();

            }
        );
    }

    function createTokenSettingsDialog() {
        $("#modal").remove();
        GM_addStyle(` 
            .jquery-modal.blocker {
                z-index: 10001 !important;
            }
            .jquery-modal {
                z-index: 10002 !important;
            }
            #modal {
                user-select: none;
            }
            #head {
              padding: 10px;
              border-bottom: 1px dashed #ccc; 
            }
        `);
        $("body").append(`
            <div id="modal" class="modal" style="min-height: 100px; z-index: 10002;">
                <h1 id="head">Settings</h1>
                <div style="margin-top:20px; font-size: 14px">
                    <h3 style="display: inline-block; margin-left: 10px" >Token:</h3>
                    <input id="token" style="min-width: 300px; display: inline-block;">
                </div>
                <div style="font-size: 14px; margin-top:20px; display: flex; justify-content: flex-end;">
                    <button id="saveSettings">Save</button>
                </div>
            </div>
        `);

        const key = localStorage.getItem("apiToken");
        if (key){
            $('#token').val(key);
        }

        $("#saveSettings").on("click", function () {
            const token = $("#token").val();
            if (token.length === 0 || token.length > 36) {
                $.notify("Invalid token", {
                    className: 'error',
                    autoHideDelay: 3000,
                    position: "right bottom",
                });
                return;
            }
            localStorage.setItem("apiToken", token);
            $.notify("Settings saved", {
                className: 'success',
                autoHideDelay: 3000,
                position: "right bottom",
            });
            $.modal.close();
        });
    }

    function openTokenSettingsDialog() {
        createTokenSettingsDialog();
        modalMonitor();
    }

    function modalMonitor() {
        $("#modal").modal({
            fadeDuration: 100
        })
            .on($.modal.BEFORE_OPEN, function (event, modal) {
                console.log("Modal is now visible");
                //add state to modal, it's a trick to save the video state
                modal.options.pause = getCurrentVideoState();
                pauseYouTubeVideo();
            })
            .on($.modal.CLOSE, function (event, modal) {
                console.log("Modal has completely closed");
                if (modal.options.pause === "playing") {
                    startYouTubeVideo();
                }
            });
    }

    function openModalDialog(start, chosenText) {
        createSaveWordsDialog(start, chosenText);
        modalMonitor();
    }

    function loadContextMenuForSubtitles() {
        GM_addStyle(`
            /* <style> Custom CSS for the menu item */
            .context-menu-item {
                font-size: 14px; /* Adjust this value to increase font size */
            }
            .context-menu-item > span {
                padding: 10px; /* Optional: adjust padding as needed */
            }
        `);
        $.contextMenu({
            selector: '#draggableSubtitles',
            callback: function (key, options) {
                const m = "clicked: " + key;
                let selectedTextAndElement = getSelectedTextAndElement();
                const text = selectedTextAndElement.text
                const allContent = selectedTextAndElement.element.textContent + text.replace(/^[\s\S]*?\n/, '').replace(/\n/g, ' ');
                const log = 'Selected text:' + allContent;
                const start = selectedTextAndElement.element?.dataset.start;

                if (allContent) {
                    openModalDialog(start, allContent);
                } else {
                    openModalDialog(start, selectedTextAndElement.element.textContent);
                }
            },
            items: {
                "save": {
                    name: "Save", icon: 'edit'
                },
            },
            events: {}
        });
    }


    function loadSubtitles(trackerIdx) {
        // Clear existing subtitles
        $(contentDiv).empty(); // Or use the loop method if preferred

        // Load and display subtitles
        renderSubtitles(getVideoIdFromUrl(), trackerIdx).then(subtitles => {
            if (subtitles) {
                for (let i = 0; i < subtitles.length; i++) {
                    const subtitle = subtitles[i];
                    const subtitleDiv = document.createElement('div');
                    subtitleDiv.style.fontSize = '16px'; // Apply font size to each subtitle
                    subtitleDiv.style.lineHeight = '1.4';
                    subtitleDiv.style.marginBottom = '5px'; // Add space between subtitles
                    subtitleDiv.style.cursor = 'pointer';
                    subtitleDiv.textContent = `${decodeHtmlEntities(subtitle.text)}`;
                    subtitleDiv.dataset.start = subtitle.start;
                    subtitleDiv.dataset.dur = subtitle.dur;
                    subtitleDiv.dataset.idx = i;
                    subtitleDiv.className = 'subtitle';

                    //Prevent double click to select text
                    subtitleDiv.addEventListener('mousedown', function (e) {
                        if (e.detail > 1) {
                            e.preventDefault();
                        }
                    });

                    // Add click event listener to set video currentTime
                    $(subtitleDiv).on("dblclick", function (event) {
                        const video = document.getElementsByTagName("video")[0];
                        if (video) {
                            video.currentTime = parseFloat(this.dataset.start);
                        }
                    });
                    contentDiv.appendChild(subtitleDiv);
                }
                loadContextMenuForSubtitles();
            }
        });
    }

    function createSwitchButton() {
        const switchButton = document.createElement('button');
        switchButton.textContent = `Auto-Scroll: ${autoScrollEnabled ? 'ON' : 'OFF'}`;
        switchButton.id = 'toggleAutoScroll';
        switchButton.style.position = 'absolute';
        switchButton.style.bottom = '-32px';
        switchButton.style.left = '-2px';
        switchButton.style.padding = '5px 10px';
        switchButton.style.cursor = 'pointer';

        // Toggle feature state
        switchButton.addEventListener('click', function () {
            autoScrollEnabled = !autoScrollEnabled;  // Toggle the state
            this.textContent = `Auto-Scroll: ${autoScrollEnabled ? 'ON' : 'OFF'}`;
            localStorage.setItem("autoScrollEnabled", autoScrollEnabled ? 'true' : 'false');
        });

        draggableDiv.appendChild(switchButton);
    }


    function loadCss() {
        // Load jQuery UI CSS and other components' CSS file
        loadCssFromURL('https://code.jquery.com/ui/1.14.0/themes/base/jquery-ui.css')
        loadCssFromURL('https://cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.7.1/jquery.contextMenu.min.css');
        loadCssFromURL('https://cdn.jsdelivr.net/npm/notify-js-legacy@0.4.1/notify.min.css');
        loadCssFromURL('https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.css');
    }

    function loadCssFromURL(url) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = url;
        document.head.appendChild(cssLink);
    }

    async function renderTrackerSelect(captionTracks) {
        select.selectmenu({
            select: function (event, ui) {
                if (ui.item?.value === -1) {
                    return;
                }
                loadSubtitles(ui.item?.value);
            }
        });

        if (!captionTracks || captionTracks.length === 0) {
            select.empty();
            const option = $("<option>", {
                text: "No subtitles",
                value: -1
            });
            select.append(option);
            select.selectmenu('refresh');
            console.error('No subtitles found for this video');
            return;
        }

    }

    async function loadSubtitlesFromYt(videoId, trackerIdx) {
        // Fetch video page HTML
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const pageHtml = await response.text();

        // Extract player response JSON from the HTML
        const playerResponseRegex = /ytInitialPlayerResponse\s*=\s*(\{.*?\});/;
        const playerResponseMatch = pageHtml.match(playerResponseRegex);

        if (!playerResponseMatch) {
            console.error('Could not extract player response');
            return;
        }

        const playerResponse = JSON.parse(playerResponseMatch[1]);

        // Get subtitle tracks
        const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        await renderTrackerSelect(captionTracks)
        console.log(captionTracks)

        // Fetch subtitles for the first track
        let subtitleTrackUrl = captionTracks[0].baseUrl;
        if (trackerIdx !== null) {
            subtitleTrackUrl = captionTracks[trackerIdx].baseUrl;
        } else {
            select.empty();
            for (let i = 0; i < captionTracks.length; i++) {
                const option = $("<option>", {
                    text: captionTracks[i].name.simpleText,
                    value: i
                });
                select.append(option);
                select.selectmenu('refresh');
            }
        }

        const subtitlesResponse = await fetch(subtitleTrackUrl);
        const subtitlesXml = await subtitlesResponse.text();

        // Parse XML and extract subtitles
        const parser = new DOMParser();
        const subtitlesDoc = parser.parseFromString(subtitlesXml, 'text/xml');
        return subtitlesDoc.getElementsByTagName('text');
    }

    // Function to load subtitles
    async function renderSubtitles(videoId, trackerIdx) {
        try {
            if (!videoId) {
                console.error('Invalid YouTube URL');
                return;
            }
            const texts = await loadSubtitlesFromYt(videoId, trackerIdx);
            // existing code to fetch and parse subtitles...
            const subtitles = [];
            for (let i = 0; i < texts.length; i++) {
                const start = texts[i].getAttribute('start');
                const dur = texts[i].getAttribute('dur');
                let text = texts[i].textContent;
                text = decodeHtmlEntities(text); // Decode HTML entities here
                subtitles.push({start, dur, text});
            }

            console.log('Subtitles:', subtitles);
            return subtitles;
        } catch (error) {
            console.error('An error occurred:', error);
        }
    }

    // Function to log fullscreen state
    const logFullscreenState = () => {
        if (document.fullscreenElement) {
            console.log('YouTube is in fullscreen mode');
            $(draggableDiv).hide()
        } else {
            console.log('YouTube exited fullscreen mode');
            $(draggableDiv).show()
        }
    };

    function createWindowDiv() {

        $.notify("Initialize..", {
            className: 'success',
            autoHideDelay: 3000,
            position: "right bottom",
        });

        // Get initial position and size from localStorage
        const initialPositionAndSize = getPositionAndSize();
        // Create draggable and resizable window elements
        draggableDiv = document.createElement('div');
        draggableDiv.id = 'draggableSubtitles';
        Object.assign(draggableDiv.style, {
            width: initialPositionAndSize.width,
            height: initialPositionAndSize.height,
            zIndex: 1000,
            padding: '0.5em',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            position: 'absolute',
            left: initialPositionAndSize.left,
            top: initialPositionAndSize.top,
        });
        //init then hide
        $(draggableDiv).hide();

        const headerDiv = document.createElement('div');
        headerDiv.className = 'header';
        Object.assign(headerDiv.style, {
            cursor: 'move',
            backgroundColor: '#ccc',
            padding: '10px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '14px'
        });
        headerDiv.textContent = 'Drag me to change the position';
        contentDiv.className = 'content';
        contentDiv.style.padding = '10px';

        windowDiv = document.createElement('div');
        Object.assign(windowDiv.style, {
            overflow: 'auto',
            position: 'absolute',
            width: '95%',
            height: '85%',
        });

        // Assemble the draggable and resizable window
        windowDiv.appendChild(contentDiv);
        draggableDiv.appendChild(headerDiv);
        createSwitchButton();
        draggableDiv.appendChild(windowDiv);

        const selectContainer = $(`<div id="select-container"></div>`)
        select = $(`<select id="videoTrackerSelect">
                <option>Select a video tracker</option>
                </select>`)
        selectContainer
            .css('position', 'absolute')
            .css('bottom', '-34px')
            .css('right', '-12px')
            .css('padding', '5px 10px')
            .css('z-index', 10000)

        selectContainer.append(select)
        $(draggableDiv).append(selectContainer);

        // Append the draggable and resizable window to the body
        document.body.appendChild(draggableDiv);

        // Make the window draggable
        $('#draggableSubtitles').draggable({
            handle: '.header',
            stop: function (event, ui) {
                const left = ui.position.left + 'px';
                const top = ui.position.top + 'px';
                const width = $('#draggableSubtitles').width() + 'px';
                const height = $('#draggableSubtitles').height() + 'px';
                savePositionAndSize(left, top, width, height);
            }
        });

        // Make the window resizable
        $('#draggableSubtitles').resizable({
            stop: function (event, ui) {
                const left = ui.position.left + 'px';
                const top = ui.position.top + 'px';
                const width = ui.size.width + 'px';
                const height = ui.size.height + 'px';
                savePositionAndSize(left, top, width, height);
            }
        });

    }

    function main() {
        loadCss();
        $(document).ready(createWindowDiv)
        //handle YouTube page changed event
        document.addEventListener('fullscreenchange', logFullscreenState);
        document.addEventListener('yt-page-data-updated', onPageChanged);
        setupVideoPlayerListener();
    }

    main();
})();
