/**
 * Vérification la disponibilité du RDV à la préfecture France
 *
 * @author Zhao ZHANG <zo.zhang@gmail.com>
 * @website zozhang.github.io
 */
;(function($){

    let rdv;

    // dom ready jquery
    $(function($) {

        rdv = {
            params: {
                host: 'ws://localhost:3000',
                storageKey: 'rdv-prefecture-params',
                audio: 'mp3/bell-ringing.mp3'
            },

            // initialise les paramètres du HTML et les valeus par défaut et les events.
            initialized: function() {
                rdv.initializParams();
                rdv.initializEvents();
                rdv.initialiseAudio();
                rdv.initializWebSocket();
            },

            // initialise les variables d'element du HTML
            initializParams: function() {
                // form
                rdv.params.MainForm = $('#main-form');

                // console
                rdv.params.Console = $('#console');

                // submit button
                rdv.params.SubmitBtn = $('button');

                const storage = rdv.getLocalStorage(rdv.params.storageKey);
                if (storage && storage.url) {
                    $('input[type="text"]', rdv.params.MainForm).val(storage.url);
                }
            },

            // initialise les events
            initializEvents: function() {
                // form
                rdv.params.MainForm.submit(rdv.initialiseRecherche);
            },

            // initialise connexion websocket
            initializWebSocket: function() {
                rdv.params.socket = io(rdv.params.host, {transports: ['websocket', 'polling', 'flashsocket']});
                rdv.params.socket.on('connect', () => {
                    // const params = rdv.getLocalStorage(rdv.params.storageKey);
                    //
                    // // reconnect
                    // if (params) {
                    //     rdv.params.SubmitBtn.trigger('click');
                    // }
                });

                // mise a jour les notifications.
                rdv.params.socket.on('showResult', (res) => {
                    let message = '';
                    let className = rdv.getRandomStyle();
                    let li = document.createElement("li");
                    let time = document.createElement("time");

                    console.log(res);

                    if (res.success) {
                        className = 'text-success';
                        rdv.playAudio();
                    } else if (res.error_code) {
                        className = 'text-danger';
                    }

                    $(li).addClass(className);

                    if (res.guichet) {
                        res.guichet = res.guichet.replace('remise d\'un titre de séjour - ', '');
                        message += res.guichet + ' - ' + res.message;
                    } else {
                        message += res.message;
                    }

                    $(time).text(res.time);

                    $(li).append(message);
                    $(li).append(time)

                    if (res.success && res.url) {
                        $(li).append('<br/><a href="'+res.url+'" target="_blank">'+res.url+'</a>');
                    }

                    rdv.params.Console.css('visibility', 'visible').prepend($(li));
                });
            },

            initialiseRecherche: function(e) {

                e.preventDefault();

                const input = $("input", $(this));
                const button = $("button", $(this));
                const data = $(this).serializeArray();

                for(let i in data) {
                    rdv.params[data[i].name] = data[i].value;
                }

                let params = {url: rdv.params.url, interval: rdv.params.intervalle, userAgent: navigator.userAgent};
                rdv.toLocalStorage(rdv.params.storageKey, params);
                rdv.params.socket.emit('initialiseRecherche', params , function(res) {
                    rdv.disabledForm();
                    console.log('callback server:', res);
                });
                return false;
            },

            initialiseAudio: function() {
                rdv.params.audio = window.location.href + rdv.params.audio;
                rdv.params.audioElement = document.createElement('audio');
                rdv.params.audioElement.setAttribute('src', rdv.params.audio);
            },

            playAudio: function() {
                rdv.params.AudioPlayCount = 3;
                rdv.params.AudioIntervalId = setInterval(function(){

                    rdv.params.audioElement.play();

                    if (rdv.params.AudioPlayCount <= 0 ) {
                        window.clearInterval(rdv.params.AudioIntervalId);
                    }

                    rdv.params.AudioPlayCount--;

                }, 1000);
            },

            stopAudio: function() {
                rdv.params.audioElement.pause();
            },

            disabledForm: function() {

               const input = $("input", rdv.params.MainForm);
               const button = $("button", rdv.params.MainForm);

               input.attr('disabled','disabled');
               button.attr('disabled','disabled').removeClass('btn-success').addClass('btn-secondary');

            },

            getRandomInt: function(min, max) {
                min = Math.ceil(min);
                max = Math.floor(max);
                return Math.floor(Math.random() * (max - min + 1)) + min;
            },

            getRandomStyle: function() {
               let textStyles = ['text-primary', 'text-warning', 'text-yello', 'text-info'];
               let randomStyle = textStyles[rdv.getRandomInt(0, textStyles.length - 1)];

               if (rdv.params.currStyle == randomStyle) {
                    return rdv.getRandomStyle();
               } 

               rdv.params.currStyle = randomStyle;

               return randomStyle;
            },

            isSupportlocalStorage: function () {
                return (('localStorage' in window) && window['localStorage'] !== null)
            },

            toLocalStorage: function(key, item) {

                if (!rdv.isSupportlocalStorage()) {
                    return false;
                }

                item = JSON.stringify(item);

                window.localStorage.setItem(key, item);

            },

            getLocalStorage: function(key) {

                if (!rdv.isSupportlocalStorage()) {
                    return false;
                }

                let item = localStorage.getItem(key);

                if (item) {
                    item = JSON.parse(item);
                }

                return item;
            }
           
        };

        rdv.initialized();
    });
})(jQuery);
