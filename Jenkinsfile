pipeline {
    agent any

    environment {
        BUILDER_HOST = '192.168.1.38'
        STAGING_HOST = '192.168.1.33'
        PROD_HOST    = '192.168.1.36'
        DEPLOY_USER  = 'root'
        APP_DIR      = '/opt/sage3'
        REGISTRY     = '192.168.1.30:3000'
        GITEA_REPO   = 'http://192.168.1.30:3000/gitea-admin/next.git'
        BRANCH       = 'pr/ldap-local-auth'
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Build images') {
            steps {
                sshagent(credentials: ['jenkins-deploy-key']) {
                    sh """
                        ssh ${DEPLOY_USER}@${BUILDER_HOST} '
                            rm -rf /tmp/sage3-build &&
                            git clone --branch ${BRANCH} ${GITEA_REPO} /tmp/sage3-build &&
                            cd /tmp/sage3-build &&

                            docker build -f deployment/node_server/Dockerfile \
                                -t ${REGISTRY}/gitea-admin/sage3-node-server:latest . &&
                            docker push ${REGISTRY}/gitea-admin/sage3-node-server:latest &&

                            docker build -f deployment/node_files/Dockerfile \
                                -t ${REGISTRY}/gitea-admin/sage3-files:latest . &&
                            docker push ${REGISTRY}/gitea-admin/sage3-files:latest &&

                            docker build -f deployment/node_yjs/Dockerfile \
                                -t ${REGISTRY}/gitea-admin/sage3-yjs:latest . &&
                            docker push ${REGISTRY}/gitea-admin/sage3-yjs:latest &&

                            rm -rf /tmp/sage3-build
                        '
                    """
                }
            }
        }

        stage('Deploy Staging') {
            when {
                anyOf {
                    branch 'staging'
                    branch 'staging/*'
                    branch 'feature/*'
                }
            }
            steps {
                sshagent(credentials: ['jenkins-deploy-key']) {
                    sh """
                        ssh ${DEPLOY_USER}@${STAGING_HOST} '
                            mkdir -p ${APP_DIR} &&
                            cd ${APP_DIR} &&
                            [ -f .env ] || (echo "ERREUR: .env absent — SAGE3_SERVER et LDAP_BIND_PASSWORD requis" && exit 1) &&
                            grep -q LDAP_BIND_PASSWORD .env || (echo "ERREUR: LDAP_BIND_PASSWORD absent du .env" && exit 1) &&
                            git config --global --add safe.directory ${APP_DIR} 2>/dev/null || true &&
                            if [ -d .git ]; then
                                git fetch origin ${BRANCH} && git checkout ${BRANCH} && git pull origin ${BRANCH}
                            else
                                git clone --branch ${BRANCH} ${GITEA_REPO} /tmp/sage3-stg &&
                                cp -r /tmp/sage3-stg/. . &&
                                rm -rf /tmp/sage3-stg
                            fi &&
                            LDAP_PASS=\$(grep LDAP_BIND_PASSWORD .env | cut -d= -f2) &&
                            cp deployment/configurations/node/sage3-staging.hjson deployment/configurations/node/sage3-prod.hjson &&
                            sed -i "s/CHANGE_ME_LDAP_PASS/\${LDAP_PASS}/" deployment/configurations/node/sage3-prod.hjson &&
                            cp .env deployment/.env &&
                            grep -q NODE_SERVER_REPLICAS deployment/.env    || echo NODE_SERVER_REPLICAS=1     >> deployment/.env &&
                            grep -q NODE_FILE_SERVER_REPLICAS deployment/.env || echo NODE_FILE_SERVER_REPLICAS=1 >> deployment/.env &&
                            docker compose -f deployment/docker-compose-amd64.yml \
                                -f deployment/docker-compose.registry-override.yml pull &&
                            docker compose -f deployment/docker-compose-amd64.yml \
                                -f deployment/docker-compose.registry-override.yml up -d
                        '
                    """
                }
            }
        }

        stage('Deploy Production') {
            when {
                not {
                    anyOf {
                        branch 'staging'
                        branch 'staging/*'
                        branch 'feature/*'
                    }
                }
            }
            input {
                message 'Déployer SAGE3 en production ?'
                ok 'Déployer'
            }
            steps {
                sshagent(credentials: ['jenkins-deploy-key']) {
                    sh """
                        ssh ${DEPLOY_USER}@${PROD_HOST} '
                            mkdir -p ${APP_DIR} &&
                            cd ${APP_DIR} &&
                            [ -f .env ] || (echo "ERREUR: .env absent — SAGE3_SERVER et LDAP_BIND_PASSWORD requis" && exit 1) &&
                            grep -q LDAP_BIND_PASSWORD .env || (echo "ERREUR: LDAP_BIND_PASSWORD absent du .env" && exit 1) &&
                            git config --global --add safe.directory ${APP_DIR} 2>/dev/null || true &&
                            if [ -d .git ]; then
                                git fetch origin ${BRANCH} && git checkout ${BRANCH} && git pull origin ${BRANCH}
                            else
                                git clone --branch ${BRANCH} ${GITEA_REPO} /tmp/sage3-deploy &&
                                cp -r /tmp/sage3-deploy/. . &&
                                rm -rf /tmp/sage3-deploy
                            fi &&
                            LDAP_PASS=\$(grep LDAP_BIND_PASSWORD .env | cut -d= -f2) &&
                            sed -i "s/CHANGE_ME_LDAP_PASS/\${LDAP_PASS}/" deployment/configurations/node/sage3-prod.hjson &&
                            cp .env deployment/.env &&
                            grep -q NODE_SERVER_REPLICAS deployment/.env    || echo NODE_SERVER_REPLICAS=3     >> deployment/.env &&
                            grep -q NODE_FILE_SERVER_REPLICAS deployment/.env || echo NODE_FILE_SERVER_REPLICAS=1 >> deployment/.env &&
                            docker compose -f deployment/docker-compose-amd64.yml \
                                -f deployment/docker-compose.registry-override.yml pull &&
                            docker compose -f deployment/docker-compose-amd64.yml \
                                -f deployment/docker-compose.registry-override.yml up -d
                        '
                    """
                }
            }
        }
    }

    post {
        success { echo "Pipeline SAGE3 OK — branche ${env.BRANCH_NAME}" }
        failure { echo "Pipeline SAGE3 ECHEC — branche ${env.BRANCH_NAME}" }
    }
}
