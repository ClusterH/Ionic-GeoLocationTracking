import { Component, AfterViewChecked, ElementRef, NgZone, ViewChild, AfterViewInit } from '@angular/core';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { AlertController, Platform, NavController } from '@ionic/angular';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { NativeGeocoder, NativeGeocoderOptions, NativeGeocoderResult } from '@ionic-native/native-geocoder/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';

import { AuthenticateService } from '../services/authentication.service';
import { CrudService } from '../services/crudgeoposition.service';
import { TaskI } from '../model/task.interface';
import { NativeStorage } from '@ionic-native/native-storage/ngx';

declare var google;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage {
userLocation: any;
lat: number;
lng: number;
userAddress: (string) = "";
currentPosition:any;
gpsflg  = false;

UserName: string;
GPSGeoLocations: TaskI[];
GPSGeoLocation: TaskI = {
  UserID: '',
  PosLat: '',
  PosLng: ''
};

Users: any;
UserID: string;
PosLat: string;
PosLng: string;

@ViewChild('map', { static: true }) mapElement: ElementRef;
  map: any;
  mapOptions: any;
  markerOptions: any = {position: null, map: null, title: null};
  marker: any;
  apiKey: any = 'AIzaSyB8pf6ZdFQj5qw7rc_HSGrhUwQKfIe9ICw'; /*Your API Key*/
  setInterval: any;
  constructor(
    private plt: Platform,
    private alertCtrl: AlertController,
    public geolocation: Geolocation,
    public nativeGeocoder: NativeGeocoder,
    private androidPermissions: AndroidPermissions,
    private locationAccuracy: LocationAccuracy,
    private navCtrl: NavController,
    private authService: AuthenticateService,
    private crudService: CrudService,
    public localstorage: NativeStorage,
    public zone: NgZone
   ) {
    this.plt.ready().then((res) => {
      if(this.authService.userDetails()){
        // this.UserName = this.authService.userDetails().email;
        this.localstorage.getItem('userName_localStorage')
        .then(u => {
          this.UserName = u;
          console.log(this.UserName);
        }, error=> console.log(error)
        );
      }else{
        this.navCtrl.navigateBack('');
      }

      this.checkGPSPermission();
      if(this.setInterval){
        this.LoadMap();
      }
    }); 
  }

  
  // async presentAlert(location) {
  //   const alert = await this.alertCtrl.create({
  //     header: 'Current Position Here!',
  //     subHeader: 'Check Now',
  //     message: location,
  //     buttons: ['OK']
  //   });

  //   await alert.present();
  // }
  //Check if application having GPS access permission  
  checkGPSPermission() {
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
      result => {
        if (result.hasPermission) {
 
          //If having permission show 'Turn On GPS' dialogue
          this.askToTurnOnGPS();
        } else {
 
          //If not having permission ask for permission
          this.requestGPSPermission();
        }
      },
      err => {
        alert(err);
      }
    );
  }

  requestGPSPermission() {
    this.locationAccuracy.canRequest().then((canRequest: boolean) => {
      if (canRequest) {
        console.log("4");
      } else {
        //Show 'GPS Permission Request' dialogue
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
          .then(
            () => {
              // call method to turn on GPS
              this.askToTurnOnGPS();
            },
            error => {
              //Show alert if user click on 'No Thanks'
              alert('requestPermission Error requesting location permissions ' + error)
            }
          );
      }
    });
  }

  askToTurnOnGPS() {
    this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(
      () => {
        // When GPS Turned ON call method to get Accurate location coordinates
        this.gpsflg = true;
        // this.getGeoencoder()
        // this.Interval_Display();
        // const googleMaps = await getGoogleMaps(
        //   'AIzaSyB8pf6ZdFQj5qw7rc_HSGrhUwQKfIe9ICw'
        // );
        this.LoadMap();
      },
      error => alert('Error requesting location permissions ' + JSON.stringify(error))
    );
  }

  LoadMap() {
    const googleMaps = getGoogleMaps(
      'AIzaSyB8pf6ZdFQj5qw7rc_HSGrhUwQKfIe9ICw'
    );
      this.geolocation.getCurrentPosition({maximumAge: 1000, timeout: 5000, enableHighAccuracy: true}).then(pos => {
        let latlng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        // console.log(pos.coords.latitude);
        this.map = new google.maps.Map(this.mapElement.nativeElement, {
          zoom: 6,
          center: latlng
        });
        this.marker = new google.maps.Marker({
          position: latlng,
          map: this.map,
          draggable: true
        });

        this.GPSGeoLocation.UserID = this.UserName;
        this.GPSGeoLocation.PosLat = pos.coords.latitude.toString();
        this.GPSGeoLocation.PosLng = pos.coords.longitude.toString();
        console.log(this.GPSGeoLocation.UserID);
        this.crudService.updateGPSGeoLocation(this.GPSGeoLocation, this.GPSGeoLocation.UserID);
        this.getUserList();

        this.Interval_Display();
      });
  }

  Interval_Display() {
    this.setInterval = setInterval(() => {
      this.getGeoencoder();
    }, 10000);
  }

  getGeoencoder(){
    let options: NativeGeocoderOptions = {
      useLocale: true,  
      maxResults: 5
    };

    this.geolocation.getCurrentPosition().then(resp => {
      this.GPSGeoLocation.UserID = this.UserName;
      this.GPSGeoLocation.PosLat = resp.coords.latitude.toString();
      this.GPSGeoLocation.PosLng = resp.coords.longitude.toString();
      console.log(this.GPSGeoLocation.UserID);
      this.crudService.updateGPSGeoLocation(this.GPSGeoLocation, this.GPSGeoLocation.UserID);   
    });
  }

  getUserList() {
    this.crudService.getGPSGeoLocations().subscribe(data => {
      this.Users = data.map(e => {
        return {
          UserID: e.UserID,
          PosLat: e.PosLat,
          PosLng: e.PosLng
        };
      })
      this.GPSGeoLocations = this.Users;
      console.log(this.GPSGeoLocations);
    });
  }

  logout(){
    this.authService.logoutUser()
    .then(res => {
      console.log(res);
      // this.crudService.removeGPSLocation(this.UserName);
      clearInterval(this.setInterval);
      this.navCtrl.navigateBack('');
    })
    .catch(error => {
      console.log(error);
    })
  }

  onDisplay(id: string) {
    console.log(id);
    
    this.crudService.getGPSGeoLocation(id).subscribe(data => {
      const lat = Number(data.PosLat);
      const lng = Number(data.PosLng);
      let latlng = new google.maps.LatLng(lat, lng);
      this.map = new google.maps.Map(this.mapElement.nativeElement, {
        zoom: 6,
        center: latlng
      });
      this.marker = new google.maps.Marker({
        position: latlng,
        map: this.map,
        draggable: true
      });
    })
  }
}

function getGoogleMaps(apiKey: string): Promise<any> {
  const win = window as any;
  const googleModule = win.google;
  if (googleModule && googleModule.maps) {
    return Promise.resolve(googleModule.maps);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=3.31`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    script.onload = () => {
      const googleModule2 = win.google;
      if (googleModule2 && googleModule2.maps) {
        resolve(googleModule2.maps);
      } else {
        reject('google maps not available');
      }
    };
  });
}

