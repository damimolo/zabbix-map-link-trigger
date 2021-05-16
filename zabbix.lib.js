const got = require('got');

function zabbix_request(url, auth, method, params) {
    return got.post(url + '/api_jsonrpc.php', {
        json: {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": 1,
            "auth": auth
        },
    }).json().then(function (response) {
        return new Promise(function (resolve, reject) {
            if (response.error) {
                reject(response.error);
            } else {
                resolve(response.result);
            }
        });
    });
}

module.exports = function (url, username, password) {
    let auth = null;

    return function (method, params) {
        if (auth) {
            return zabbix_request(url, auth, method, params);
        } else {
            return zabbix_request(url, null, 'user.login', {
                "user": username,
                "password": password,
            }).then(function (response) {
                auth = response;
                return zabbix_request(url, auth, method, params);
            }).catch(function (error) {
                return new Promise(function (resolve, reject) {
                    reject(error);
                });
            });
        }
    }
}
