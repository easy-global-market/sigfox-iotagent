/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of sigfox-iotagent
 *
 * sigfox-iotagent is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * sigfox-iotagent is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with sigfox-iotagent.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[daniel.moranjimenez at telefonica.com]
 */
'use strict';

var iotAgentLib = require('iotagent-node-lib'),
    sigfoxServer = require('./sigfoxServer'),
    async = require('async'),
    apply = async.apply,
    errors = require('./errors'),
    context = {
        op: 'IoTAgentSIGFOX.Core'
    },
    config = require('./configService');

function updateConfigurationHandler(newConfiguration, callback) {
    config.getLogger().error('Unsupported configuration update received');
    callback();
}

function deviceProvisioningMiddleware(device, callback) {
    config.getLogger().debug('device provisioning handler %j', device.internalAttributes);
    var mappingFound = false;
    if (device.internalAttributes) {
        for (var i = 0; i < device.internalAttributes.length; i++) {
            config.getLogger().debug('device provisioning handler %s', device.internalAttributes[i]);
            if (device.internalAttributes[i].mapping) {
                mappingFound = true;
            }
            if (device.internalAttributes[i].plugin) {
                mappingFound = true;
            }
        }
        if (!mappingFound) {
            config.getLogger().error('device provisioning mapping not found');
            callback(new errors.DataMappingNotFound(device.type), device);
        }
    }
    callback(null, device);
}

function initialize(callback) {
    iotAgentLib.setConfigurationHandler(updateConfigurationHandler);

    // Check Mapping at provision
    iotAgentLib.addDeviceProvisionMiddleware(deviceProvisioningMiddleware);

    config.getLogger().info(context, 'Agent started');
    callback();
}

function start(newConfig, callback) {
    config.setLogger(iotAgentLib.logModule);
    config.setConfig(newConfig);

    async.series(
        [apply(sigfoxServer.start, config.getConfig()), apply(iotAgentLib.activate, config.getConfig().iota)],
        function(error, results) {
            if (error) {
                callback(error);
            } else {
                config.getLogger().info(context, 'IoT Agent services activated');
                initialize(callback);
            }
        }
    );

    iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.multiEntity.update);
}

function stop(callback) {
    config.getLogger().info(context, 'Stopping IoT Agent');

    async.series([sigfoxServer.stop, iotAgentLib.deactivate], callback);
}

exports.start = start;
exports.stop = stop;
