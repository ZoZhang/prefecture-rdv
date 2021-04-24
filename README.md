# Prefecture RDV
C'est pour savoir la disponibilité du RDV à la préfecture en France.
Néanmoins, je ne garanti pas son exactitude :)

### Demo
http://rdv.zhangzhao.fr/

### Utilisation
Il est conseiller d'utiliser Chrome pour lancer cette application.

Pour lancer, il faut installer `nodejs` via ce [lien](https://nodejs.org/fr/download/).

Et après, taper ces commandes suivantes dans le terminal.

```
npm install 
```

Lorsuqe l'installation termine, taper cette commande.
```
npm start &
```

Par defaut, ce programme lance par http://localhost:3000/

Si vous voulez déployer dans un serveur. et alors, il faut configurer `Nginx/Apache` pour le websocket fonctionne.

Ex:
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

upstream websocket {
    # l'adresse du serveur nodejs
    server nodejs:3000;
}

server {
    listen   80;
    server_name rdv-prefecture.fr;
    return 301 https://$server_name$request_uri;

}

server {
    listen 443 ssl http2;
    server_name rdv-prefecture.fr;
    client_max_body_size 10M;
    root /var/www/rdv/;
    index index.html;
    
    ssl_certificate /etc/letsencrypt/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/privkey.pem; # managed by Certbot
    ssl_protocols TLSv1.2 TLSv1.1 TLSv1;

    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-RC4-SHA:!ECDHE-RSA-RC4-SHA:ECDH-ECDSA-RC4-SHA:ECDH-RSA-RC4-SHA:ECDHE-RSA-AES256-SHA:HIGH:!RC4-SHA:!aNULL:!eNULL:!LOW:!3DES:!MD5:!EXP:!CBC:!EDH:!kEDH:!PSK:!SRP:!kECDH;

    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 60m;

    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/cert.pem; 

    add_header X-Frame-Options deny;
    add_header Strict-Transport-Security "max-age=63072000; includeSubdomains; preload";
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
    }
}

```
### Démonstration

<img src="https://imgur.com/OaU1e2G.png"/>
