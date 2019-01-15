// Copyright © 2018 IBM Corp. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict';

var request = require('request');
var tap = require('tap');
var test = tap.test;

var couch = require('./couch');
var follow = require('../api');
const debug = require('debug')('follow:test');

test('Issue #83', function(t) {
  debug('Entered test function.');

  // The test database may already exist at the start of the test, so we have to
  // try and delete it. If it didn't exist we remove the listener that is
  // checking for a first deleted event. If it did exist and is deleted then the
  // possibleDeleteChangeListener will handle the removal and triggering of the
  // test updates.
  // We need to allow time for the feed to establish and for events from
  // previous tests to decay before getting underway.
  setTimeout(function() {
    couch.delete_db(t, function(err, deleted) {
      t.error(err, 'There should not be an error deleting the database.')
      if (!deleted) {
        debug('Test database was not deleted.');
        generateDbUpdates();
      }
    })
  }, 3000);

  var saw_created = false;
  var saw_deleted = false;

  function isChangeForTestDb(change) {
    return couch.DB.endsWith(change.db_name);
  }

  const feed = follow({ db: couch.DB_UPDATES, since: 'now' });
  const possibleDeleteChangeListener = function(change) {
    debug(`Delete listener change ${JSON.stringify(change)}`);
    // Ignore changes that aren't for the test db
    if (isChangeForTestDb(change)) {
      if (change.type === 'deleted') {
        generateDbUpdates();
      } else {
        // If this listener was still registered when other changes arrive for
        // the test DB then fail the test
        t.fail(`Unexpected change for test DB: ${JSON.stringify(change)}`);
      }
    }
  }
  feed.on('change', possibleDeleteChangeListener);
  feed.on('error', function(err) {
    t.error(err, 'There should be no errors.');
  });

  // Genereate DB updates by creating and deleting a database.
  function generateDbUpdates() {
    debug('Entering generateDbUpdates');
    // Unregister the possible delete handler
    feed.removeListener('change', possibleDeleteChangeListener);
    // Register the listener for the test updates
    feed.on('change', function(change) {
      debug(`Test listener change ${JSON.stringify(change)}`);
      if(!isChangeForTestDb(change)) {
        return;
      }

      switch (change.type) {
        case 'created':
          debug('Test listener created case.');
          t.notOk(saw_created, 'Only saw one created event.');
          saw_created = true;
          break;
        case 'deleted':
          debug('Test listener deleted case.');
          t.notOk(saw_deleted, 'Only saw one deleted event.');
          saw_deleted = true;
          break;
        default:
          t.fail('Unexpected change type.');
      }
      if (saw_created && saw_deleted) {
        feed.stop();
      }
    })
    .on('stop', function() {
      // End the test in a while after some time to allow other assertions to
      // complete
      setTimeout(function() {
        t.end();
      }, 1000);
    })
    setTimeout(function() {
      debug('Creating test database.');
      request.put({ uri: couch.DB, json: true }, function(err, res) {
        debug('Created test database.');
        t.error(err, 'Create database without error');
        t.equal(res.statusCode, 201, 'Create database request returns 201.');
        debug('Deleting test database.');
        request.delete({ uri: couch.DB, json: true }, function(err, res) {
          debug('Deleted test database.');
          t.error(err, 'Delete database without error.');
          t.equal(res.statusCode, 200, 'Delete database request returns 200.');
        });
      });
    }, 1000);
  }
});
