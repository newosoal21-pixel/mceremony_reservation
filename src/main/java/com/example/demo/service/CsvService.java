package com.example.demo.service;

import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.model.BusSituation;
import com.example.demo.model.Parking;
import com.example.demo.model.ParkingStatus;
import com.example.demo.model.ShuttleBusReservation; // 💡 既存のインポートを維持
import com.example.demo.model.VisitSituation;
import com.example.demo.model.Visitor;
import com.example.demo.repository.BusSituationRepository;
import com.example.demo.repository.ParkingRepository;
import com.example.demo.repository.ParkingStatusRepository;
import com.example.demo.repository.ShuttleBusReservationRepository; // 💡 既存のインポートを維持
import com.example.demo.repository.VisitSituationRepository;
import com.example.demo.repository.VisitorRepository;

@Service
public class CsvService {

    private final ParkingRepository parkingRepository;
    private final ParkingStatusRepository parkingStatusRepository;
    private final VisitorRepository visitorRepository;
    private final VisitSituationRepository visitSituationRepository;
    // 💡 ShuttleBusReservationRepositoryの型と名前が一致しているか確認
    private final ShuttleBusReservationRepository shuttlebusReservationRepository; 
    private final BusSituationRepository busSituationRepository; 
    
    // CSV内の日付/時刻フォーマット
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy/M/d H:mm");
    
    @Autowired
    public CsvService(
            ParkingRepository parkingRepository, 
            ParkingStatusRepository parkingStatusRepository,
    	    VisitorRepository visitorRepository, 
    	    VisitSituationRepository visitSituationRepository,
            ShuttleBusReservationRepository shuttlebusReservationRepository, 
            BusSituationRepository busSituationRepository) { 
        
        this.parkingRepository = parkingRepository;
        this.parkingStatusRepository = parkingStatusRepository;
        this.visitorRepository = visitorRepository;
        this.visitSituationRepository = visitSituationRepository;
        this.shuttlebusReservationRepository = shuttlebusReservationRepository;
        this.busSituationRepository = busSituationRepository;
    }

    // ------------------------------------------------------------------------
    // 駐車場予約CSVインポート処理 (変更なし)
    // ------------------------------------------------------------------------
    @Transactional
    public void importParkingData(MultipartFile file) throws Exception {
        
        CSVFormat format = CSVFormat.DEFAULT.builder()
            .setDelimiter(',')
            .setIgnoreEmptyLines(true)
            .setAllowMissingColumnNames(true)
            .build();

        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVParser csvParser = new CSVParser(reader, format)) {
            
            List<Parking> parkingsToSave = new ArrayList<>();

            for (CSVRecord csvRecord : csvParser) {
                if (csvRecord.size() < 13) { 
                     System.err.println("スキップされたレコード: 列数が不足しています " + csvRecord);
                     continue;
                }
                
                Parking parking = mapCsvToParkingEntity(csvRecord);
                parkingsToSave.add(parking);
            }

            saveAllParkings(parkingsToSave);
        }
    }

    private Parking mapCsvToParkingEntity(CSVRecord record) {
        Parking parking = new Parking(); 

        String visitTimeStr = record.get(1).trim();
        if (!visitTimeStr.isEmpty()) {
            parking.setVisitReservationTime(LocalDateTime.parse(visitTimeStr, DATETIME_FORMATTER));
        }
        parking.setErrandsRelationship(record.get(2).trim());
        parking.setCarNumber(record.get(3).trim());
        parking.setVisitorName(record.get(4).trim());
        parking.setFamilyNames(record.get(5).trim());
        parking.setManagerName(record.get(6).trim());

        String depTimeStr = record.get(7).trim();
        if (!depTimeStr.isEmpty()) {
            parking.setDepartureTime(LocalDateTime.parse(depTimeStr, DATETIME_FORMATTER));
        }
        
        parking.setParkingPermit(record.get(8).trim());
        parking.setParkingPosition(record.get(9).trim());
        
        String name = record.get(10).trim();
        
        if (!name.isEmpty()) {
            Optional<ParkingStatus> statusOpt = parkingStatusRepository.findByName(name);
            
            if (statusOpt.isPresent()) {
                parking.setParkingStatus(statusOpt.get());
            } else {
                throw new RuntimeException("DBに登録されていない駐車状況名です: " + name);
            }
        } else {
            final String DEFAULT_STATUS_NAME = "予約中"; 
            Optional<ParkingStatus> defaultStatusOpt = parkingStatusRepository.findByName(DEFAULT_STATUS_NAME); 
            
            if (defaultStatusOpt.isPresent()) {
                parking.setParkingStatus(defaultStatusOpt.get()); 
            } else {
                throw new RuntimeException("必須項目である駐車状況名が空欄ですが、代替のデフォルトステータス ('" + DEFAULT_STATUS_NAME + "') もDBに存在しません。マスタを確認してください。");
            }
        }
        parking.setRemarksColumn(record.get(12).trim());

        return parking;
    }

    private void saveAllParkings(List<Parking> newParkings) {
        for (Parking newParking : newParkings) {
            
            Optional<Parking> existingOpt = parkingRepository
                .findByVisitorNameAndVisitReservationTime(
                    newParking.getVisitorName(), 
                    newParking.getVisitReservationTime());

            if (existingOpt.isPresent()) {
                Parking existing = existingOpt.get();
                
                existing.setErrandsRelationship(newParking.getErrandsRelationship());
                existing.setCarNumber(newParking.getCarNumber());
                existing.setDepartureTime(newParking.getDepartureTime());
                existing.setParkingPermit(newParking.getParkingPermit());
                existing.setParkingPosition(newParking.getParkingPosition());
                existing.setParkingStatus(newParking.getParkingStatus());
                existing.setRemarksColumn(newParking.getRemarksColumn());
                
                parkingRepository.save(existing); 
            } else {
                parkingRepository.save(newParking); 
            }
        }
    }
    
	// ------------------------------------------------------------------------
	// 来館者予約CSVインポート処理 (変更なし)
	// ------------------------------------------------------------------------
    @Transactional
	 public void importVisitData(MultipartFile file) throws Exception {
	     CSVFormat format = CSVFormat.DEFAULT.builder()
	         .setDelimiter(',')
	         .setIgnoreEmptyLines(true)
	         .setAllowMissingColumnNames(true)
	         .build();

	     try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
	          CSVParser csvParser = new CSVParser(reader, format)) {
	         
	         List<Visitor> visitsToSave = new ArrayList<>();

	         for (CSVRecord csvRecord : csvParser) {
	             if (csvRecord.size() < 10) { 
	                 System.err.printf("スキップされたレコード: 列数が不足しています (Size: %d) CSVRecord: %s%n", 
	                                   csvRecord.size(), csvRecord.toString());
	                 continue; 
	             } 
	             
	             Visitor visit = mapCsvToVisitEntity(csvRecord);
	             visitsToSave.add(visit);
	         }
	
	         saveAllVisits(visitsToSave);
	     }
	 }
	
	 private Visitor mapCsvToVisitEntity(CSVRecord record) {
	     Visitor visitor = new Visitor();
	     
	     String visitTimeStr = record.get(1).trim();
	     if (!visitTimeStr.isEmpty()) {
	         visitor.setVisitReservationTime(LocalDateTime.parse(visitTimeStr, DATETIME_FORMATTER));
	     }
	
	     visitor.setErrandsRelationship(record.get(2).trim());
	     visitor.setVisitorName(record.get(3).trim());
	     visitor.setFamilyNames(record.get(4).trim());
	     visitor.setManagerName(record.get(5).trim());
	     
	     String cmpTimeStr = record.get(6).trim();
	     if (!cmpTimeStr.isEmpty()) {
	         visitor.setCompilationCmpTime(LocalDateTime.parse(cmpTimeStr, DATETIME_FORMATTER));
	     }
	     
	     final String DEFAULT_STATUS_NAME = "来館前"; 
	     
	     Optional<VisitSituation> defaultStatusOpt = visitSituationRepository.findBySituationName(DEFAULT_STATUS_NAME); 
	     
	     if (defaultStatusOpt.isPresent()) {
	         visitor.setVisitSituation(defaultStatusOpt.get()); 
	     } else {
	         throw new RuntimeException("必須項目である来館状況IDのデフォルト値 ('" + DEFAULT_STATUS_NAME + "') がDBに存在しません。マスタを確認してください。");
	     }
	
	     visitor.setRemarksColumn(record.get(8).trim());
	
	     return visitor;
	 }
	
	 private void saveAllVisits(List<Visitor> newVisits) {
	     for (Visitor newVisit : newVisits) {
	         
	         Optional<Visitor> existingOpt = visitorRepository
	             .findByVisitorNameAndVisitReservationTime(
	                 newVisit.getVisitorName(), 
	                 newVisit.getVisitReservationTime());
	
	         if (existingOpt.isPresent()) {
	             Visitor existing = existingOpt.get();
	             
	             existing.setErrandsRelationship(newVisit.getErrandsRelationship());
	             existing.setFamilyNames(newVisit.getFamilyNames());
	             existing.setManagerName(newVisit.getManagerName());
	             existing.setCompilationCmpTime(newVisit.getCompilationCmpTime());
	             existing.setVisitSituation(newVisit.getVisitSituation());
	             existing.setRemarksColumn(newVisit.getRemarksColumn());
	             
	             visitorRepository.save(existing);
	         } else {
	             visitorRepository.save(newVisit);
	         }
	     }
	 }
	 
	// ------------------------------------------------------------------------
	// 🚨 送迎バス予約CSVインポート処理 (エラー解消 & 修正版) 🚨
	// ------------------------------------------------------------------------
	@Transactional 
	public void importBusData(MultipartFile file) throws Exception {
	     CSVFormat format = CSVFormat.DEFAULT.builder()
	         .setDelimiter(',')
	         .setIgnoreEmptyLines(true)
	         .setAllowMissingColumnNames(true)
	         .build();

	     try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
	          CSVParser csvParser = new CSVParser(reader, format)) {
	         
	         List<ShuttleBusReservation> busesToSave = new ArrayList<>();
	         
	         for (CSVRecord csvRecord : csvParser) {
	             // CSVのデータ列は12列 (0から11) と仮定
	             if (csvRecord.size() < 12) { 
	                 System.err.printf("スキップされたバス予約レコード: 列数が不足しています (Size: %d) CSVRecord: %s%n", 
	                                   csvRecord.size(), csvRecord.toString());
	                 continue; 
	             } 
	             
	             try {
	                ShuttleBusReservation bus = mapCsvToBusEntity(csvRecord);
	                busesToSave.add(bus);
	             } catch (NumberFormatException e) {
	                 // 💡 乗車人数のパースエラーを明確に捕捉
	                 throw new RuntimeException("送迎バスCSVの処理に失敗しました。乗車人数に不正な値が含まれています。詳細: " + e.getMessage(), e);
	             } catch (IllegalArgumentException e) {
	                 // 💡 必須項目エラーを捕捉
	                 throw new RuntimeException("送迎バスCSVの処理に失敗しました。必須項目が不足しています。詳細: " + e.getMessage(), e);
	             }
	         }

	         saveAllBuses(busesToSave);
	     }
	}

	// CsvService.java 内の mapCsvToBusEntity 関数全体を置き換えてください

	private ShuttleBusReservation mapCsvToBusEntity(CSVRecord record) {
	    ShuttleBusReservation bus = new ShuttleBusReservation();
	    
	    // ----------------------------------------------------------------------------------
	    // 💡 1. visitReservationTime (DATETIME) - インデックス 1 (予約日時)
	    // ----------------------------------------------------------------------------------
	    String visitTimeStr = record.get(1).trim();
	    if (!visitTimeStr.isEmpty()) {
	        // DATETIME_FORMATTER = "yyyy/M/d H:mm" を使用
	        bus.setVisitReservationTime(LocalDateTime.parse(visitTimeStr, DATETIME_FORMATTER));
	    } else {
	        throw new IllegalArgumentException("予約日時 (visit_reservation_time) は必須項目です。");
	    }

	    // ----------------------------------------------------------------------------------
	    // 💡 2. busName (運行会社名) - インデックス 2 に修正
	    // ----------------------------------------------------------------------------------
	    bus.setBusName(record.get(2).trim()); // 以前は record.get(3) だった
	    
	    // ----------------------------------------------------------------------------------
	    // 💡 3. busDestination (行き先) - インデックス 3 に修正 (NOT NULL 対応)
	    // ----------------------------------------------------------------------------------
	    String destinationStr = record.get(3).trim(); // 以前は record.get(2) だった
	    if (destinationStr.isEmpty()) {
	        throw new IllegalArgumentException("行き先 (busDestination) は必須項目です。"); 
	    }
	    bus.setBusDestination(destinationStr);
	    
	    // ----------------------------------------------------------------------------------
	    // 💡 4. scheduled_dep_time (DATETIME) - インデックス 4 と仮定 (定刻出発時間)
	    // ----------------------------------------------------------------------------------
	    String scheduledTimeStr = record.get(4).trim();
	    if (!scheduledTimeStr.isEmpty()) {
	        bus.setScheduledDepTime(LocalDateTime.parse(scheduledTimeStr, DATETIME_FORMATTER));
	    } else {
	         throw new IllegalArgumentException("定刻出発時間 (scheduled_dep_time) は必須項目です。");
	    }

	    // ----------------------------------------------------------------------------------
	    // 💡 5. familyNames - インデックス 5
	    // ----------------------------------------------------------------------------------
	    bus.setFamilyNames(record.get(5).trim());

	    // ----------------------------------------------------------------------------------
	    // 💡 6. managerName - インデックス 6
	    // ----------------------------------------------------------------------------------
	    bus.setManagerName(record.get(6).trim());

	    // ----------------------------------------------------------------------------------
	    // 💡 7. passengers (乗車人数) - インデックス 7 と仮定 (空欄・"名" 修正済み)
	    // ----------------------------------------------------------------------------------
	    String passengersStr = record.get(7).trim();

	    if (passengersStr.isEmpty()) {
	        bus.setPassengers((short) 0); // 空欄の場合は 0名 として続行
	    } else {
	        String cleanPassengersStr = passengersStr.replace("名", "").trim();
	        
	        if (cleanPassengersStr.isEmpty()) {
	            bus.setPassengers((short) 0);
	        } else {
	            bus.setPassengers(Short.parseShort(cleanPassengersStr)); 
	        }
	    }
	    // ----------------------------------------------------------------------------------
	    
	    // 💡 8. busSituations (外部キー) - CSVにIDが存在しないためデフォルト値を設定
	    final String DEFAULT_STATUS_NAME = "到着前"; 
	    Optional<BusSituation> defaultStatusOpt = busSituationRepository.findByName(DEFAULT_STATUS_NAME); 
	    
	    if (defaultStatusOpt.isPresent()) {
	        bus.setBusSituation(defaultStatusOpt.get()); 
	    } else {
	        throw new RuntimeException("必須項目であるバス状況IDのデフォルト値 ('" + DEFAULT_STATUS_NAME + "') がDBに存在しません。マスタを確認してください。");
	    }

	    // 💡 9. remarksColumn - インデックス 11 と仮定
	    // CSVレコードの長さは少なくとも12（インデックス 11 まで）必要
	    if (record.size() > 11) {
	        bus.setRemarksColumn(record.get(11).trim());
	    }
	    
	    // emptybus_dep_time, departure_time はCSVにないためNULL/DEFAULTのまま

	    return bus;
	}

	private void saveAllBuses(List<ShuttleBusReservation> newBuses) {
	    for (ShuttleBusReservation newBus : newBuses) { 
	        
	        Optional<ShuttleBusReservation> existingOpt = shuttlebusReservationRepository
	            .findByBusNameAndVisitReservationTime(
	                newBus.getBusName(), 
	                newBus.getVisitReservationTime());

	        if (existingOpt.isPresent()) {
	            // UPDATE処理
	            ShuttleBusReservation existing = existingOpt.get(); 
	            
	            existing.setBusDestination(newBus.getBusDestination());
	            existing.setEmptybusDepTime(newBus.getEmptybusDepTime());
	            existing.setScheduledDepTime(newBus.getScheduledDepTime());
	            existing.setDepartureTime(newBus.getDepartureTime());
	            existing.setFamilyNames(newBus.getFamilyNames());
	            existing.setManagerName(newBus.getManagerName());
	            existing.setPassengers(newBus.getPassengers());
	            existing.setBusSituation(newBus.getBusSituation()); // 💡 復活
	            existing.setRemarksColumn(newBus.getRemarksColumn());
	            
	            shuttlebusReservationRepository.save(existing);
	        } else {
	            // INSERT処理
	            shuttlebusReservationRepository.save(newBus);
	        }
	    }
	}
}