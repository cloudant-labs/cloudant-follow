#!groovy
// Copyright © 2017, 2018 IBM Corp. All rights reserved.
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

def setupNodeAndTest(version, couchDbVersion='latest') {
  node {
    // To get the docker sidecar run to default to docker-in-docker we must
    // unset the DOCKER_HOST variable.
    withEnv(["DOCKER_HOST="]){
      // Install CouchDB
      docker.image("couchdb:${couchDbVersion}").withRun('-p 5984:5984') {
        // Install NVM
        sh 'wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash'
        // Unstash the built content
        unstash name: 'built'
        // Run tests using creds
        withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'couchdb', usernameVariable: 'user', passwordVariable: 'pass']]) {
          withEnv(["NVM_DIR=${env.HOME}/.nvm", "TAP_TIMEOUT=300", "COUCHDB_VERSION=${couchDbVersion}"]) {
            // Actions:
            //  1. Load NVM
            //  2. Install/use required Node.js version
            //  3. Wait for CouchDB
            sh """
              [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
              nvm install ${version}
              nvm use ${version}
              wget --retry-connrefused http://localhost:5984
            """
            // Create _global_changes DB if newer CouchDB versions
            if (couchDbVersion != '1') {
              sh 'curl -X PUT http://localhost:5984/_global_changes'
            }
            // Run tests
            sh 'npm test && npm run unreliable-feed-test'
          }
        }
      }
    }
  }
}

stage('Build') {
  // Checkout, build
  node {
    checkout scm
    sh 'npm install'
    stash name: 'built'
  }
}

stage('QA') {
  def axes = [
    // Using latest CouchDB @1.x:
    CouchDb1LatestNode:   { setupNodeAndTest('node', '1') },
    // Using latest CouchDB @2.X:
    CouchDb2LatestNode:   { setupNodeAndTest('node', '2') }
  ]
  parallel(axes) // Run the required axes in parallel
}

// Publish the master branch
stage('Publish') {
  gkLockfile {}
  if (env.BRANCH_NAME == "master") {
    node {
      unstash 'built'

      def v = com.ibm.cloudant.integrations.VersionHelper.readVersion(this, 'package.json')
      String version = v.version
      boolean isReleaseVersion = v.isReleaseVersion

      // Upload using the NPM creds
      withCredentials([string(credentialsId: 'npm-mail', variable: 'NPM_EMAIL'),
                       usernamePassword(credentialsId: 'npm-creds', passwordVariable: 'NPM_PASS', usernameVariable: 'NPM_USER')]) {
        // Actions:
        // 1. add the build ID to any snapshot version for uniqueness
        // 2. install login helper
        // 3. login to npm, using environment variables specified above
        // 4. publish the build to NPM adding a snapshot tag if pre-release
        sh """
          ${isReleaseVersion ? '' : ('npm version --no-git-tag-version ' + version + '.' + env.BUILD_ID)}
          sudo npm install -g npm-cli-login
          npm-cli-login
          npm publish ${isReleaseVersion ? '' : '--tag snapshot'}
        """
      }
    }
  }

  // Run the gitTagAndPublish which tags/publishes to github for release builds
  gitTagAndPublish {
      versionFile='package.json'
      releaseApiUrl='https://api.github.com/repos/cloudant-labs/cloudant-follow/releases'
  }
}
