#!/bin/bash

sudo chmod -R 777 /root/dento-backend

cd

cd dento-backend

npm install

pm2 restart 0
