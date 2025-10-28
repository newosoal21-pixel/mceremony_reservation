package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles; // 追加

@SpringBootTest
@ActiveProfiles("local")// 追加
class ClemonyReservationApplicationTests {

	@Test
	void contextLoads() {
	}

}
