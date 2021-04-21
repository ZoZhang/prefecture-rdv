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
                host: 'wss://localhost',
                audio: 'https://www.soundjay.com/misc/sounds/bell-ringing-01.mp3'
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
            },

            // initialise les events du HTML(input、button) pour manipuler le jeu
            initializEvents: function() {
                // form
                rdv.params.MainForm.submit(rdv.initialiseRecherche);
            },

            // initialise connexion websocket
            initializWebSocket: function() {
                rdv.params.socket = io(rdv.params.host, {transports: ['websocket'], secure: false});

                rdv.params.socket.on('connect', () => {
                    console.log('WebSocket Client Connecté:', rdv.params.host);
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
                        rdv.params.audioElement.play();
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

                    $(time).text(res.time).addClass('float-right');

                    $(li).append(message);
                    $(li).append(time)

                    if (res.url) {
                        $(li).append('<br/><a href="'+res.url+'" target="_blank">'+res.url+'</a>');
                    }

                    rdv.params.Console.css('visibility', 'visible').prepend($(li));
                });
            },

            initialiseRecherche: function(e) {

                e.preventDefault();

                const input = $("input", $(this));
                const button = $("button", $(this));

                let data = $(this).serializeArray();

                for(let i in data) {
                    rdv.params[data[i].name] = data[i].value;
                }

                input.attr('disabled','disabled');
                button.attr('disabled','disabled').removeClass('btn-success').addClass('btn-secondary');

                rdv.params.socket.emit('initialiseRecherche', {url: rdv.params.url, interval: rdv.params.intervalle}, function(res) {

                });
                return false;
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

            initialiseAudio: function() {
                rdv.params.audioElement = document.createElement('audio');
                rdv.params.audioElement.setAttribute('src', rdv.params.audio);
                
                rdv.params.audioElement.addEventListener('ended', function() {
                    this.play();
                }, false);
            }
        };

        rdv.initialized();
    });
})(jQuery);
