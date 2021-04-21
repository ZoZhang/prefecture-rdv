/**
 * Vérification la disponibilité du RDV à la préfecture France
 *
 * @author Zhao ZHANG <zo.zhang@gmail.com>
 * @website zozhang.github.io
 */
 
const port = 8899;
const requests = {
    index: 0,
    body: null,
    time: null,
    message: '',
    reg: {
        ids: /(\d+).*?(?=\")/ig,
        labels: /(?<=\<label.*\>).*?(?=\<\/)/ig,
        radios: /(?<=\<input.*type=\"radio\".*value=\").*?(?=\").*(?<=\<label.*\>).*?(?=\<\/)/ig,
        nordv: /existe plus de plage horaire libre|ultérieurement/ig,
        maintenance: /site indisponible|maintenance/ig
    }
};

const io = require('socket.io')(port);
var moment = require('moment');
var request = require('request');
var exec = require('child_process').execFile;
var jar = request.jar();

io.sockets.on('connection', socket => {

    socket.id = socket.id;
    console.log('nouveau client connecté:' + socket.id);

    socket.on('disconnect', cleanTask);
    socket.on('deconnexion', cleanTask);
    socket.on('initialiseRecherche', (data, callback) => {
        requests.url = data.url;
        requests.interval = data.interval;
        requests.mode = 'default';
        requests.start = new Date();
        recherche();
        requests.intervalId = setInterval(recherche, requests.interval * 1000);
        callback({success: true, startRecherche: true});
    });

    function recherche()
    {
        switch(requests.mode) {
            case 'guichet':
                if (requests.guichet.length) {

                    if (requests.index > requests.guichet.length - 1) {
                        requests.index = 0;
                    } else if (requests.index < 0) {
                        requests.index = requests.guichet.length;
                    }

                    requests.postData = {
                         planning: requests.guichet[requests.index].id,
                         nextButton: 'Etape suivante'
                     };

                    requests.index++;
               }
            break;
            default:
             requests.postData = {
                condition : 'on',
                nextButton : 'Effectuer une demande de rendez-vous'
             };
            break;
        }

        console.log('postData Debug:');
        console.log(requests.postData);

        request({
            url: requests.url,
            method: 'post',
            form: requests.postData,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
                'Referer': requests.url
            },
            jar: jar
        }, function(err, response, body) {

            requests.end = new Date();
            requests.time = moment().format('YYYY-MM-DD HH:mm:ss') + ' ';

            if (err) {
               requests.message = err.code + ' - ' + err.message + 'ಠ·ಠ';
               io.to(socket.id).emit('showResult', {success: false, message: requests.message, time: requests.time});
            } else if (response.statusCode != 200) {
                requests.message = response.statusCode + ' - ' + 'siteweb indisponible au ce moment.. ಠ·ಠ';
               io.to(socket.id).emit('showResult', {success: false, message: requests.message, time: requests.time});
            } else {

                requests.body = body.toLowerCase();

                switch(requests.mode) {
                    case 'guichet':
                        if (requests.body.match(requests.reg.maintenance)) {
                            requests.message = 'site indisponible à ce moment.. (¬_¬)';
                            io.to(socket.id).emit('showResult', {success: false, message: requests.message, guichet: requests.guichet[requests.index - 1].label, time: requests.time});
                        } else if (requests.body.match(requests.reg.nordv)) {
                            requests.message = 'aucun rdv indisponible à ce moment.. (¬_¬)';
                            io.to(socket.id).emit('showResult', {success: false, message: requests.message, guichet: requests.guichet[requests.index - 1].label, time: requests.time});
                        } else {
                            requests.message = 'Youpi !!! rdv disponible, vite vite (・ω<)';
                            io.to(socket.id).emit('showResult', {success: true, message: requests.message, url: requests.url, guichet: requests.guichet[requests.index -1 ].label, time:requests.time});
                        }
                    break;

                    default:

                        let radios = requests.body.match(requests.reg.radios);
                        if (radios) {
                            requests.guichet = [];
                            for(let i in radios) {
                                let ids = radios[i].match(requests.reg.ids);
                                let labels = radios[i].match(requests.reg.labels);
                                if (ids && labels) {
                                    requests.guichet.push({
                                        id: ids.pop(),
                                        label: labels.pop()
                                    });
                                }
                            }

                            if (requests.guichet) {
                                requests.mode = 'guichet';
                                requests.url = response.request.uri.href;
                                recherche();
                            }
                        }
                    break;
                }
            }

            console.log(requests.time + requests.message);
        });
    }

    // nettoye intervaller
    function cleanTask()
    {
        clearInterval(requests.intervalId);
        console.log("client déconnectée:" + socket.id);

    }
});

console.log('Websocket service commence sur ws://127.0.0.1:%s, Appuyez sur Ctrl + C pour arrêter.', port);