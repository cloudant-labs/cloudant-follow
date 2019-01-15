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

var tap = require('tap');
var test = tap.test;

var couch = require('./couch');
var follow = require('../api');

couch.setup(test);

if (process.env.COUCHDB_VERSION && !process.env.COUCHDB_VERSION.startsWith('1')) {
  // NOTE: Selector syntax is not supported in CouchDB 1.x.
  test('Issue #71', function(t) {
    var feed = follow(couch.DB, function() {});

    feed.db = couch.DB;
    feed.filter = '_selector'
    feed.request = {
      method: 'POST',
      body: JSON.stringify({ selector: { _id: { $eq: 'doc_third' } }})
    }

    feed.on('change', function(change) {
      t.ok(change.id === 'doc_third', 'Got the third document');
      feed.stop();
    })
    .on('error', function(err) {
      t.error(err, 'There should be no errors.');
    })
    .on('stop', function() {
      t.end();
    })
  });
}
