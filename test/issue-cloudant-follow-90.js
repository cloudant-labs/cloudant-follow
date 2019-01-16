// Copyright © 2019 IBM Corp. All rights reserved.
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

function testFeedStop(afterCount, t) {
  var feed = follow(couch.DB, function() {});
  var count = 0;
  var hasStopped = false;
  feed.db = couch.DB;

  feed
  .on('start', function() {
    if (afterCount === 0) {
      feed.stop();
    }
  })
  .on('change', function(change) {
    count++;
    if(hasStopped) {
      t.fail('Should receive no changes after stopping.');
      t.end();
    }
    if (count === afterCount) {
      feed.stop();
    }
  })
  .on('stop', function() {
    hasStopped = true;
    t.end();
  })
}

couch.setup(test);
test('Issue #90 - stop immediately', function(t) {
  testFeedStop(0, t);
});

test('Issue #90 - stop after one change, changes still pending', function(t) {
  testFeedStop(1, t);
});

test('Issue #90 - stop with no further changes', function(t) {
  testFeedStop(3, t);
});
