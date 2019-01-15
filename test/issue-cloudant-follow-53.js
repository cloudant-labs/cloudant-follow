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

test('Issue #53', function(t) {
  var feed = follow(couch.DB, function() {});
  var i = 0;
  var saw = {};

  feed.db = couch.DB;

  feed.filter = function(doc, req) {
    i += 1;

    // validate change request params
    t.equal(req.query.feed, 'continuous');
    t.equal(req.query.heartbeat, 30000);
    t.equal(req.query.since, 0);
    t.ok(req.query.include_docs);

    return true;
  };

  feed.on('change', function(change) {
    saw[change.id] = true;

    if (i === 3) {
      t.ok(saw.doc_first, 'Got the first document');
      t.ok(saw.doc_second, 'Got the second document');
      t.ok(saw.doc_third, 'Got the third document');

      feed.stop();
    }
  })
  .on('stop', function() {
    t.end();
  });
});
