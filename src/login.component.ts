import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth/auth.service';
import { Router } from '@angular/router';
// ถ้าย้ายหน้าด้วย Router ให้ import Router มาด้วย

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    if(!this.username || !this.password) return alert('กรุณากรอกข้อมูลให้ครบ');
    
    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        alert(`ยินดีต้อนรับ ${res.user.username} (สถานะ: ${res.user.role})`);
        // TODO: สั่งเปลี่ยนหน้าไปหน้า Gallery
        this.router.navigate(['/']);
      },
      error: (err) => {
        alert(err.error.message || 'รหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ');
      }
    });
  }
}