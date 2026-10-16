import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://dpg-studio-backend.onrender.com/auth'; // 🌟 เปลี่ยนเป็น URL ของ Render ออนไลน์

  // เก็บสถานะผู้ใช้ปัจจุบัน
  public currentUser = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {
    // โหลดข้อมูลจาก LocalStorage ตอนเปิดเว็บ
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      this.currentUser.next(JSON.parse(savedUser));
    }
  }

  // 🌟 เพิ่มฟังก์ชันสมัครสมาชิก
  register(userData: any) {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  // ฟังก์ชัน login ที่ Frontend จะเรียกใช้
  login(credentials: any) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        // บันทึก Token และข้อมูล User ลง LocalStorage
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUser.next(response.user);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.next(null);
  }

  // เช็คสิทธิ์ Creator
  get isCreator() {
    return this.currentUser.value?.role === 'CREATOR' || this.currentUser.value?.role === 'ADMIN';
  }

  // เช็คสิทธิ์ Admin
  get isAdmin() {
    return this.currentUser.value?.role === 'ADMIN';
  }
}