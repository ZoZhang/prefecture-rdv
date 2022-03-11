/**
 * Vérification la disponibilité du RDV à la préfecture France
 *
 * @author Zhao ZHANG <zo.zhang@gmail.com>
 * @website zozhang.github.io
 */

const port = 3000;
const express = require('express');
const app = express();
const http = require("http").createServer(app);
const io = require('socket.io')(http);
const moment = require('moment');
const request = require('request');
const exec = require('child_process').execFile;
const jar = request.jar();

const servers = {
    queue: [],
    reg: {
        ids: /(\d+).*?(?=\")/ig,
        labels: /(?<=\<label.*\>).*?(?=\<\/)/ig,
        radios: /(?<=\<input.*type=\"radio\".*value=\").*?(?=\").*(?<=\<label.*\>).*?(?=\<\/)/ig,
        nordv: /existe plus de plage horaire libre/ig,
        maintenance: /site indisponible|maintenance/ig,
        convovation:/ancien titre|récépissé|vous présenter|votre convocation|ancien titre et récépissé|passeport biométrique|timbres fiscaux|une plage horaire|Rechargement automatique du calendrier/ig,
    }
};


app.use(express.static('public'));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

io.sockets.on('connection', socket => {

    console.log('nouveau client connecté:' + socket.id);

    socket.on('disconnect', cleanTask);

    socket.on('initialiseRecherche', (data, callback) => {

        if (!servers.queue[socket.id]) {
            servers.queue[socket.id] = {};
        }

        servers.queue[socket.id].index = 0;
        servers.queue[socket.id].url = data.url;
        servers.queue[socket.id].interval = data.interval;
        servers.queue[socket.id].userAgent = data.userAgent;
        servers.queue[socket.id].mode = 'default';
        servers.queue[socket.id].intervalId = setInterval(recherche, servers.queue[socket.id].interval * 1000);

        recherche();

        callback({success: true, startRecherche: true});

    });

    function recherche()
    {

        for(let socketId in servers.queue) {
          
            let currentQueue = servers.queue[socketId];

            currentQueue.message = ''
            currentQueue.start = new Date();

            switch(currentQueue.mode) {
                case 'guichet':
                    if (currentQueue.guichet.length) {

                        if (currentQueue.index > currentQueue.guichet.length - 1) {
                            currentQueue.index = 0;
                        } else if (currentQueue.index < 0) {
                            currentQueue.index = currentQueue.guichet.length;
                        }

                        currentQueue.postData = {
                             planning: currentQueue.guichet[currentQueue.index].id,
                             nextButton: 'Etape suivante'
                         };

                        currentQueue.index++;
                   }
                break;
                case 'covocation':


                break;
                default:
                 currentQueue.postData = {
                    condition : 'on',
                    nextButton : 'Effectuer une demande de rendez-vous'
                 };
                break;
            }

            console.log('postData Debug:' + socketId + ' ' + currentQueue.start);
            console.log(currentQueue.postData);

            request({
                url: currentQueue.url,
                method: 'post',
                form: currentQueue.postData,
                headers: {
                    'User-Agent': currentQueue.userAgent,
                    'Referer': currentQueue.url
                },
                jar: jar
            }, function(err, response, body) {
                currentQueue.end = new Date();
                currentQueue.time = moment().format('YYYY-MM-DD HH:mm:ss') + ' ';

                if (err) {
                   currentQueue.message = err.code + ' - ' + err.message + ' ಠ·ಠ';
                   io.to(socketId).emit('showResult', {success: false, error_code: err.code ,message: currentQueue.message, time: currentQueue.time});
                } else if (response.statusCode != 200) {
                    currentQueue.message = response.statusCode + ' - ' + 'siteweb indisponible à ce moment.. ಠ·ಠ';
                   io.to(socketId).emit('showResult', {success: false, error_code: response.statusCode, message: currentQueue.message, time: currentQueue.time});
                } else {

                    currentQueue.body = body.toLowerCase();

                    switch(currentQueue.mode) {
                        case 'guichet':

                            let success = false
                            let guichetI = currentQueue.index - 1;

                            if (currentQueue.body.match(servers.reg.convovation)){
                                success = true
                                currentQueue.message = 'Youpi !!! rdv disponible, vite vite (・ω<)';
                            } else if (currentQueue.body.match(servers.reg.nordv)) {
                                currentQueue.message = 'aucun rdv indisponible à ce moment.. (¬_¬)';
                            } else if (currentQueue.body.match(servers.reg.maintenance)) {
                                currentQueue.message = 'site indisponible à ce moment.. (¬_¬)';
                            }

                            io.to(socketId).emit('showResult', {success: success, message: currentQueue.message, url: currentQueue.url, guichet: currentQueue.guichet[guichetI].label, time: currentQueue.time});

                        break;

                        default:

                            let radios = currentQueue.body.match(servers.reg.radios);
                            if (radios) {
                                currentQueue.guichet = [];
                                for(let i in radios) {
                                    let ids = radios[i].match(servers.reg.ids);
                                    let labels = radios[i].match(servers.reg.labels);
                                    if (ids && labels) {
                                        currentQueue.guichet.push({
                                            id: ids.pop(),
                                            label: labels.pop()
                                        });
                                    }
                                }

                                if (currentQueue.guichet) {
                                    currentQueue.mode = 'guichet';
                                    currentQueue.url = response.request.uri.href;
                                    recherche();
                                }
                            }
                        break;
                    }
                }
                 console.log('Response Debug:' + ' ' + currentQueue.message);
            });
        }
    }

    function cleanTask()
    {
        if (!servers.queue[socket.id]) {
            return;
        }

        clearInterval(servers.queue[socket.id].intervalId);

        delete servers.queue[socket.id];

        console.log("client déconnectée:" + socket.id);
    }
});

http.listen(port, () => console.log("http://localhost:"+port));

