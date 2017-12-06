#!groovy
// Copyright © 2017 IBM Corp. All rights reserved.
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

def setupNodeAndTest(version) {
  node {
    // Install CouchDB 1.6.1
    docker.image('apache/couchdb:1.7.1').withRun('-p 5984:5984') {
      // Install NVM
      sh 'wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash'
      // Unstash the built content
      unstash name: 'built'
      // Run tests using creds
      withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'couchdb', usernameVariable: 'user', passwordVariable: 'pass']]) {
        withEnv(["NVM_DIR=${env.HOME}/.nvm", "TAP_TIMEOUT=300"]) {
          // Actions:
          //  1. Load NVM
          //  2. Install/use required Node.js version
          //  3. Run tests
          sh """
            [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
            nvm install ${version}
            nvm use ${version}
            npm test && npm run unreliable-feed-test
          """
        }
      }
    }
  }
}

String getVersionFromPackageJson() {
  packageInfo = readJSON file: 'package.json'
  return packageInfo.version
}

String version = null;
boolean isReleaseVersion = false;

stage('Build') {
  // Checkout, build
  node {
    checkout scm
    version = getVersionFromPackageJson();
    isReleaseVersion = !version.toUpperCase(Locale.ENGLISH).contains('SNAPSHOT')
    sh 'npm install'
    stash name: 'built'
  }
}

stage('QA') {
  def axes = [
    Node4x: { setupNodeAndTest('lts/argon') }, // 4.x LTS
    Node6x: { setupNodeAndTest('lts/boron') }, // 6.x LTS
    Node:   { setupNodeAndTest('node') }       // Current
  ]
  parallel(axes) // Run the required axes in parallel
}

// Publish the master branch
stage('Publish') {
  if (env.BRANCH_NAME == "master") {
    node {
      checkout scm // re-checkout to be able to git tag

      // Upload using the ossrh creds (upload destination logic is in build.gradle)
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

      // if it is a release build then do the git tagging
      if (isReleaseVersion) {

        // Read the CHANGES.md to get the tag message
        tagMessage = ''
        for (line in readFile('CHANGES.md').readLines()) {
          if (!''.equals(line)) {
            // append the line to the tagMessage
            tagMessage = "${tagMessage}${line}\n"
          } else {
            break
          }
        }

        // Use git to tag the release at the version
        try {
          // Awkward workaround until resolution of https://issues.jenkins-ci.org/browse/JENKINS-28335
          withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'github-token', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD']]) {
            sh "git config user.email \"nomail@hursley.ibm.com\""
            sh "git config user.name \"Jenkins CI\""
            sh "git config credential.username ${env.GIT_USERNAME}"
            sh "git config credential.helper '!echo password=\$GIT_PASSWORD; echo'"
            sh "git tag -a ${version} -m '${tagMessage}'"
            sh "git push origin ${version}"
          }
        } finally {
          sh "git config --unset credential.username"
          sh "git config --unset credential.helper"
        }
      }
    }
  }
}
