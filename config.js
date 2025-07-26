const ENV = 'prod';

window.DATA_URL = {
    local: 'http://localhost:9000',
    prod: 'https://data.effiy.cn',
}[ENV];

window.API_URL = {
    local: 'http://localhost:8000',
    prod: 'https://api.effiy.cn',
}[ENV];
