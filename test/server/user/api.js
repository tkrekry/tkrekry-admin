'use strict';

var should = require( 'should' ),
  app = require( '../../../server' ),
  factory = require( '../../support/fixtures/factory' ),
  mongoose = require( 'mongoose' ),
  Advertisement = mongoose.model( 'Advertisement' ),
  Employer = mongoose.model( 'Employer' ),
  User = mongoose.model( 'User' ),
  async = require( 'async' ),
  _ = require( 'lodash' ),
  Session = require( 'supertest-session' )( {
    app: app
  } );

var firstsEmployer,
  userEmployer,
  otherEmployer,
  adminUse,
  normalUser,
  secondNormalUser,
  userDefaults = {
    provider: 'local',
    first_name: 'First name',
    last_name: 'Last name',
    email: 'test@test.com',
    password: 'password',
    role: 'user'
  };

describe( 'user management', function () {
  beforeEach( function ( done ) {
    User.remove()
      .exec();
    Advertisement.remove()
      .exec();
    Employer.remove()
      .exec();

    async.waterfall( [

        function ( cb ) {
          factory( 'employer', {}, function ( sampleUserEmployer ) {
            userEmployer = sampleUserEmployer;
            factory( 'employer', {}, function ( randomEmployer ) {
              firstsEmployer = randomEmployer
              factory( 'employer', {}, function ( secondRandomEmployer ) {
                otherEmployer = secondRandomEmployer;
                cb( null, sampleUserEmployer, randomEmployer );
              } );
            } );

          } );
        },
        function ( sampleUserEmployer, randomEmployer, cb ) {
          factory( 'user',
            _.merge( userDefaults, {
              employers: [ sampleUserEmployer._id ],
              email: 'test@test.com',
              role: 'user'
            } ),
            function ( createdUser ) {
              normalUser = createdUser;

              factory( 'user',
                _.merge( userDefaults, {
                  role: 'admin',
                  email: 'admin@test.com'
                } ),
                function ( adminUser ) {
                  adminUser = adminUser;

                  factory( 'user',
                    _.merge( userDefaults, {
                      role: 'user',
                      email: 'test-2@test.com'
                    } ),
                    function ( secondUser ) {
                      secondNormalUser = secondUser;
                      cb( null, sampleUserEmployer, randomEmployer );
                    } );
                } );
            }
          );
        },
        function ( sampleUserEmployer, randomEmployer, cb ) {
          var count = 0;
          var _advertisementsForUser = [],
            _advertisements = [];

          async.whilst(
            function () {
              return count < 2;
            },
            function ( callback ) {
              count++;
              factory.create( 'advertisement', {
                employer: sampleUserEmployer
              }, function ( advertisementForUser ) {
                _advertisementsForUser.push( advertisementForUser );
                factory.create( 'advertisement', {
                  employer: randomEmployer
                }, function ( ad ) {
                  _advertisements.push( ad );
                  callback( null, _advertisementsForUser, _advertisements );
                } );

              } );
            },
            function ( err ) {
              cb( err, _advertisementsForUser, _advertisements, sampleUserEmployer, randomEmployer );
            }
          );
        },
      ],

      function ( err, _advertisementsForUser, _advertisements, _userEmployer, _otherEmployer ) {
        done();
      } );
  } );


  describe( 'authenticated user', function () {
    beforeEach( function ( done ) {
      this.sess = new Session();

      this.sess
        .post( '/api/session' )
        .send( {
          email: 'test@test.com',
          password: 'password'
        } )
        .expect( 200 )
        .end( onResponse );

      function onResponse( err, res ) {
        if ( err ) return done( err );
        return done();
      }
    } );

    it('POST /api/users is not allowed for normal user', function (done) {
       this.sess
        .post( '/api/users')
        .send(userDefaults)
        .expect( 403 )
        .expect( 'Content-Type', /json/ )
        .end( function ( err, res ) {
          if ( err ) return done( err );

          done();
        });
    } );

    it( 'DELETE /api/users/:userId is not allowed for normal user', function ( done ) {
      this.sess
        .del( '/api/users/' + secondNormalUser._id)
        .expect( 403 )
        .expect( 'Content-Type', /json/ )
        .end( function ( err, res ) {
          if ( err ) return done( err );

          done();
        });
    } );


    afterEach( function ( done ) {
      this.sess
        .del( '/api/session' )
        .expect( 200 )
        .end( onResponse );

      function onResponse( err, res ) {
        if ( err ) return done( err );
        return done();
      }
    } );
  } );

  describe( 'authenticated admin', function () {
    beforeEach( function ( done ) {
      this.sess = new Session();

      this.sess
        .post( '/api/session' )
        .send( {
          email: 'admin@test.com',
          password: 'password'
        } )
        .expect( 200 )
        .end( onResponse );

      function onResponse( err, res ) {
        if ( err ) return done( err );
        return done();
      }
    } );

    it('POST /api/users is allowed for admin user', function (done) {
       this.sess
        .post( '/api/users')
        .send(_.merge(userDefaults, {email: 'new-user@email.com'}))
        .expect( 200 )
        .expect( 'Content-Type', /json/ )
        .end( function ( err, res ) {
          if ( err ) return done( err );
          done();
        });
    });

    it('POST /api/users wont create user with existing email', function (done) {
       this.sess
        .post( '/api/users')
        .send(userDefaults)
        .expect( 400 )
        .expect( 'Content-Type', /json/ )
        .end( function ( err, res ) {
          if ( err ) return done( err );
          done();
        });
    });

    it( 'DELETE /api/users/:userId is allowed for admin user', function ( done ) {
      this.sess
        .del( '/api/users/' + secondNormalUser._id)
        .expect( 200 )
        .expect( 'Content-Type', /json/ )
        .end( function ( err, res ) {
          if ( err ) return done( err );

          done();
        });
    } );


    afterEach( function ( done ) {
      this.sess
        .del( '/api/session' )
        .expect( 200 )
        .end( onResponse );

      function onResponse( err, res ) {
        if ( err ) return done( err );
        return done();
      }
    } );
  } );

} );
