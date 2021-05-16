const zabbix_lib = require('./zabbix.lib.js');
const inquirer = require('inquirer');
const fs = require('fs');

let config = {
	'zabbix_url': 'http://localhost/',
	'zabbix_username': 'Admin',
	'zabbix_password': 'zabbix',
	'zabbix_map': '1'
};
let zabbix = null;

if (fs.existsSync('./zabbix.json')) {
	config = JSON.parse(fs.readFileSync('./zabbix.json', 'utf8'));
}

inquirer.prompt([{
			'type': 'input',
			'name': 'zabbix_url',
			'message': 'Zabbix URL (without final "/")',
			'default': config.zabbix_url,
		}, {
			'type': 'input',
			'name': 'zabbix_username',
			'message': 'Zabbix username',
			'default': config.zabbix_username,
		}, {
			'type': 'password',
			'name': 'zabbix_password',
			'message': 'Zabbix password',
			'default': config.zabbix_password,
		}, {
			'type': 'list',
			'name': 'zabbix_map',
			'message': 'Zabbix map',
			'choices': function (answers) {
				config = answers;

				let maps;

				zabbix = zabbix_lib(config.zabbix_url, config.zabbix_username, config.zabbix_password);

				return zabbix('map.get', {}).then(function (maps) {
					return new Promise(function (resolve, reject) {
						resolve(maps.map(function (e) {
								return {
									'name': e.name,
									'value': e.sysmapid
								}
							}));
					});
				}).catch(function (error) {
					return new Promise(function (resolve, reject) {
						reject(error);
					});
				});
			},
			'default': config.zabbix_map
		}
	]).then(function (answers) {
	config = answers;
	fs.writeFileSync('./zabbix.json', JSON.stringify(config), 'utf8');

	zabbix('map.get', {
		'sysmapids': answers.zabbix_map,
		'selectSelements': 'extend',
		'selectLinks': 'extend',
	}).then(function (map) {
		map = map[0];
		console.log('Found', map.selements.length, 'elements');
		console.log('Found', map.links.length, 'links');

		zabbix('host.get', {
			'selectTriggers': ['triggerid', 'description']
		}).then(function (hosts) {
			console.log('Found', hosts.length, 'hosts');

			map.links = map.links.map(function (link) {
				let host1 = null;
				let host1_name = null;
				let host2 = null;
				let host2_name = null;
				linktriggerid = 5000;

				link.linktriggers = [];

				map.selements.forEach(function (selement) {
					if (selement.elementtype == 0 && selement.selementid == link.selementid1) {
						host1 = selement.elements[0].hostid;
					}
					if (selement.elementtype == 0 && selement.selementid == link.selementid2) {
						host2 = selement.elements[0].hostid;
					}
				});

				hosts.forEach(function (host) {
					if (host.hostid == host1) {
						host1_name = host.host;
					}
					if (host.hostid == host2) {
						host2_name = host.host;
					}
				})

				hosts.forEach(function (host) {
					if (host.hostid == host1) {
						host.triggers.forEach(function (trigger) {
							if (trigger.description.indexOf(host2_name) >= 0) {
								link.linktriggers.push({
									"linktriggerid": linktriggerid++,
									"linkid": link.linkid,
									"triggerid": trigger.triggerid,
									"drawtype": "0",
									"color": "DD0000"
								})
							}
						})
					}
					if (host.hostid == host2) {
						host.triggers.forEach(function (trigger) {
							if (trigger.description.indexOf(host1_name) >= 0) {
								link.linktriggers.push({
									"linktriggerid": linktriggerid++,
									"linkid": link.linkid,
									"triggerid": trigger.triggerid,
									"drawtype": "0",
									"color": "DD0000"
								})
							}
						})
					}
				})
				return link;
			})
			
			console.log('Found', linktriggerid - 5000, 'trigger');

			zabbix('map.update', {
				'sysmapid': config.zabbix_map,
				'links': map.links
			}).then( function(response){
				console.log("Map updated");
			}).catch(function(error){
				console.error(error);
			})

		}).catch(function (error) {
			console.error(error);
		});
	});
}).catch(function (error) {
	console.error(error);
});
