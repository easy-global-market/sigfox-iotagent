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

/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

const iotAgent = require('../../lib/iotagentCore');
const iotAgentLib = require('iotagent-node-lib');
const _ = require('underscore');
const mappings = require('../../lib/mappings');
const request = require('request');
const mongoUtils = require('../tools/mongoDBUtils');
const utils = require('../tools/utils');
const async = require('async');
const apply = async.apply;
const config = require('../testConfig');
const should = require('should');
const nock = require('nock');

describe('Device and configuration provisioning', function() {
    beforeEach(function(done) {
        iotAgent.start(config, function(error) {
            async.series([apply(mongoUtils.cleanDbs, config.iota.contextBroker.host), mappings.clean], function(error) {
                done();
            });
        });
    });

    afterEach(function(done) {
        iotAgentLib.resetMiddlewares(function(error) {
            iotAgent.stop(done);
        });
    });

    describe('When a new Device provisioning arrives to the IoT Agent without internal mapping', function() {
        const provisioningOpts = {
            url: 'http://localhost:' + config.iota.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/examples/deviceProvisioning/deviceProvisioningNoMapping.json'),
            headers: {
                'fiware-service': 'dumbMordor',
                'fiware-servicepath': '/deserts'
            }
        };

        it('should fail with a 400 error', function(done) {
            request(provisioningOpts, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                done();
            });
        });
    });
    describe('When a new Device provisioning arrives to the IoT Agent with a right mapping', function() {
        const provisioningOpts = {
            url: 'http://localhost:' + config.iota.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/examples/deviceProvisioning/deviceProvisioningRightMapping.json'),
            headers: {
                'fiware-service': 'dumbMordor',
                'fiware-servicepath': '/deserts'
            }
        };
        const dataOpts = {
            url: 'http://localhost:17428/update',
            method: 'GET',
            qs: {
                id: 'sigApp2',
                time: 1430909015,
                statin: '0A5F',
                lng: -4,
                lat: 41,
                data: '000000020000000000230c6f'
            }
        };

        nock('http://' + config.iota.contextBroker.host + ':' + config.iota.contextBroker.port)
            .post(
                '/ngsi-ld/v1/entityOperations/upsert/',
                utils.readExampleFile('./test/examples/deviceProvisioning/expectedProvisioningRequest.json')
            )
            .reply(204);

        nock('http://' + config.iota.contextBroker.host + ':' + config.iota.contextBroker.port)
            .patch(
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Device:sigApp2/attrs',
                utils.readExampleFile('./test/examples/deviceProvisioning/expectedDataUpdateRequest.json')
            )
            .reply(204);

        it('should use the provided provisioning', function(done) {
            request(provisioningOpts, function(error, response, body) {
                should.not.exist(error);

                request(dataOpts, function(error, response, body) {
                    should.not.exist(error);
                    response.statusCode.should.equal(200);

                    done();
                });
            });
        });
    });
    describe('When a new Sigfox configuration arrives to the IoT Agent without internal mapping', function() {
        it('should fail with a 400 error');
    });
    describe('When a new Sigfox configuration arrives to the IoT Agent with a right mapping', function() {
        it('should add the new mapping to the mappings module');
    });
    describe('When a new Device provisioning arrives to the IoT Agent with a multi entity mapping', function() {
        var provisioningOpts = {
                url: 'http://localhost:' + config.iota.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/examples/deviceProvisioning/deviceProvisioningMultiEntityRequest.json'
                ),
                headers: {
                    'fiware-service': 'dumbMordor',
                    'fiware-servicepath': '/deserts'
                }
            },
            dataOpts = {
                url: 'http://localhost:17428/update',
                method: 'GET',
                qs: {
                    id: 'Device1',
                    time: 1430909015,
                    data: '{"consumed": 10, "minFlow": 20}'
                }
            };

        nock('http://' + config.iota.contextBroker.host + ':' + config.iota.contextBroker.port)
            .post(
                '/ngsi-ld/v1/entityOperations/upsert/',
                utils.readExampleFile('./test/examples/deviceProvisioning/expectedProvisioningMultiEntityRequest.json')
            )
            .reply(204);

        nock('http://' + config.iota.contextBroker.host + ':' + config.iota.contextBroker.port)
            .patch(
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Device:Device1/attrs',
                utils.readExampleFile('./test/examples/deviceProvisioning/expectedDataUpdateMultiEntityRequest.json')
            )
            .reply(204);

        nock('http://' + config.iota.contextBroker.host + ':' + config.iota.contextBroker.port)
            .patch(
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Consumer:Consumer1/attrs',
                utils.readExampleFile(
                    './test/examples/deviceProvisioning/expectedDataUpdateMultiEntityRequestConsumer.json'
                )
            )
            .reply(204);

        it('should use the provided provisioning with multientity', function(done) {
            request(provisioningOpts, function(error, response, body) {
                should.not.exist(error);

                request(dataOpts, function(error, response, body) {
                    should.not.exist(error);
                    response.statusCode.should.equal(200);

                    done();
                });
            });
        });
    });
    describe('When a new Device provisioning arrives to the IoT Agent with a observedAt query', function() {
        var provisioningOpts = {
                url: 'http://localhost:' + config.iota.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/examples/deviceProvisioning/deviceProvisioningTimestampRequest.json'
                ),
                headers: {
                    'fiware-service': 'dumbMordor',
                    'fiware-servicepath': '/deserts'
                }
            },
            dataOpts = {
                url: 'http://localhost:17428/update',
                method: 'GET',
                qs: {
                    id: 'Device2',
                    observedAt: 1430909015,
                    data: '{"consumed": 10}'
                }
            };

        nock('http://' + config.iota.contextBroker.host + ':' + config.iota.contextBroker.port)
            .post(
                '/ngsi-ld/v1/entityOperations/upsert/',
                utils.readExampleFile('./test/examples/deviceProvisioning/expectedProvisioningTimestampRequest.json')
            )
            .reply(204);

        nock('http://' + config.iota.contextBroker.host + ':' + config.iota.contextBroker.port)
            .patch(
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Device:Device2/attrs',
                utils.readExampleFile('./test/examples/deviceProvisioning/expectedDataUpdateTimestampRequest.json')
            )
            .reply(204);

        it('should use the provided provisioning with timestamp', function(done) {
            request(provisioningOpts, function(error, response, body) {
                should.not.exist(error);

                request(dataOpts, function(error, response, body) {
                    should.not.exist(error);
                    response.statusCode.should.equal(200);

                    done();
                });
            });
        });
    });
});
